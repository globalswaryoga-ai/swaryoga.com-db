/**
 * QR WhatsApp Automation Handler
 *
 * Processes Welcome + Keyword automation rules for QR WhatsApp.
 * Sends via EC2 Baileys bridge — never touches Meta Cloud API.
 * Strict tenant isolation: rules filtered by createdByUserId.
 */

import { connectDB } from '@/lib/db';
import { getLead, getWhatsAppAutomationRule, getQrWhatsAppMessage, getQrWhatsAppChat, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { isQrTenantConnected, resolveQrTenantBridge, sendQrTenantMessage } from '@/lib/qrTenantBridge';

function applySpintax(text: string): string {
  if (!text) return '';
  return text.replace(/\{([^}]+)\}/g, (_, group) => {
    const options = group.split('|');
    return options[Math.floor(Math.random() * options.length)];
  });
}

async function sendViaQrBridge(params: {
  userId: string;
  phone: string;
  text: string;
  connectedPhone: string;
  lead: any;
  ruleId: string;
}): Promise<void> {
  const { userId, phone, text, connectedPhone, lead, ruleId } = params;
  const session = await resolveQrTenantBridge(userId);
  if (!session || !(await isQrTenantConnected(session))) throw new Error('Tenant QR session is disconnected');

  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  const sent = await sendQrTenantMessage(session, { to: jid, type: 'text', message: text });

  const now = new Date();
  const chatJid = jid;
  const timestampSeconds = Math.floor(now.getTime() / 1000);

  // Log to WhatsAppMessage (for history)
  const WhatsAppMessage = getWhatsAppMessage();
  await WhatsAppMessage.create({
    leadId: lead._id,
    phoneNumber: phone,
    direction: 'outbound',
    messageType: 'text',
    messageContent: text,
    status: 'sent',
    waMessageId: sent.waMessageId,
    senderNumber: connectedPhone || session.connectedPhone,
    sentAt: now,
    metadata: { automation: { ruleId, qr: true }, sessionKey: session.sessionKey, tenantId: session.tenantId },
    provider: 'whatsapp_web_bridge',
    bridgeUserId: userId,
    ownerId: userId,
  });

  // Log to QrWhatsAppMessage
  const QrWhatsAppMessage = getQrWhatsAppMessage();
  const msgId = sent.waMessageId || `qrauto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await QrWhatsAppMessage.findOneAndUpdate(
    { messageId: msgId, userId, connectedPhone },
    {
      $set: {
        userId, connectedPhone, chatJid,
        direction: 'outbound', fromMe: true,
        text, type: 'text',
        participant: '', pushName: '',
        timestamp: timestampSeconds,
        status: 1, hasMedia: false,
        mediaUrl: '', mediaMimetype: '', mediaFileName: '',
        quotedId: '', quotedText: '', quotedParticipant: '',
        rawMessage: {}, metadata: { automation: { ruleId }, sessionKey: session.sessionKey, tenantId: session.tenantId },
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true }
  );

  // Update QrWhatsAppChat
  const QrWhatsAppChat = getQrWhatsAppChat();
  await QrWhatsAppChat.findOneAndUpdate(
    { userId, connectedPhone, chatJid },
    {
      $set: {
        userId, connectedPhone, chatJid,
        name: typeof lead.name === 'string' ? lead.name : phone,
        isGroup: false,
        lastMessage: text,
        lastMessageTime: now,
        lastMessageFromMe: true,
        conversationTimestamp: timestampSeconds,
      },
      $setOnInsert: { pinned: false, archived: false, profilePicUrl: '', createdAt: now },
    },
    { upsert: true, new: true }
  );
}

/**
 * Handle inbound QR message automations (Welcome + Keyword rules).
 * Called from the QR webhook for every inbound message.
 *
 * Tenant isolation: rules filtered by createdByUserId === userId.
 */
export async function handleQrInboundAutomations(input: {
  userId: string;
  leadId: string;
  phoneNumber: string;
  messageText: string;
  wasFirstInbound: boolean;
  connectedPhone: string;
}): Promise<void> {
  const { userId, leadId, messageText, wasFirstInbound, connectedPhone } = input;

  try {
    await connectDB();

    const Lead = getLead();
    const WhatsAppAutomationRule = getWhatsAppAutomationRule();

    const lead = await Lead.findById(leadId).lean() as any;
    if (!lead) return;

    const phone = normalizePhone(String(lead.phoneNumber || input.phoneNumber));
    if (!phone) return;

    const body = messageText.trim();
    const bodyLower = body.toLowerCase();

    // STOP/UNSUBSCRIBE opt-out
    if (['stop', 'unsubscribe', 'optout'].includes(bodyLower)) return;

    // Global dedup (same message within 15s)
    const lastAutoBody = lead?.metadata?._lastQrAutoBody;
    const lastAutoAt = lead?.metadata?._lastQrAutoAt;
    if (lastAutoBody === body && lastAutoAt) {
      const elapsed = Date.now() - new Date(lastAutoAt).getTime();
      if (elapsed < 15000) return;
    }
    await Lead.updateOne(
      { _id: leadId },
      { $set: { 'metadata._lastQrAutoBody': body, 'metadata._lastQrAutoAt': new Date() } }
    );

    // Skip if lead is mid-chatbot flow (chatbot takes priority)
    if (lead?.metadata?.qrChatbotFlowState?.flowId) return;

    // Load enabled QR automation rules for this user
    const rules = await WhatsAppAutomationRule.find({
      createdByUserId: userId,
      provider: 'qr',
      enabled: true,
    }).sort({ createdAt: 1 }).lean() as any[];

    const now = Date.now();

    for (const rule of rules) {
      const triggerType: string = rule.triggerType || 'welcome';
      let matches = false;

      if (triggerType === 'welcome' && wasFirstInbound) {
        matches = true;
      } else if (triggerType === 'keyword') {
        const keywords: string[] = Array.isArray(rule.keywords) ? rule.keywords : [];
        matches = keywords.some((kw: string) => bodyLower === kw.toLowerCase() || bodyLower.includes(kw.toLowerCase()));
      }

      if (!matches) continue;

      // Throttle check
      const throttleMs = (rule.throttleMinutesPerLead || 5) * 60 * 1000;
      const lastSentKey = `_qrAutoLastSent_${rule._id}`;
      const lastSentAt = lead?.metadata?.[lastSentKey];
      if (lastSentAt && (now - new Date(lastSentAt).getTime()) < throttleMs) {
        console.log(`[QrAutomation] Throttled rule "${rule.name}" for ${phone}`);
        continue;
      }

      // Execute the rule
      if (rule.actionType === 'send_text' && rule.actionText) {
        const text = applySpintax(String(rule.actionText));
        try {
          await sendViaQrBridge({ userId, phone, text, connectedPhone, lead, ruleId: String(rule._id) });
          await Lead.updateOne(
            { _id: leadId },
            { $set: { [`metadata.${lastSentKey}`]: new Date() } }
          );
          console.log(`[QrAutomation] Sent "${rule.name}" to ${phone}`);
        } catch (sendErr: any) {
          console.error(`[QrAutomation] Send failed for rule "${rule.name}":`, sendErr.message);
        }
      }

      // Only fire one welcome rule per message
      if (triggerType === 'welcome') break;
    }
  } catch (err) {
    console.error('[QrAutomation] handleQrInboundAutomations error:', err);
  }
}
