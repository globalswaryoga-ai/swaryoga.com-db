import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
// NOTE: handleInboundWhatsAppAutomations intentionally NOT imported here.
// QR inbound messages must NOT trigger Meta Cloud API automations/auto-replies
// to prevent QR contacts from appearing in the Meta inbox.
import { normalizeQRIncomingMessages } from '@/lib/qrWebhookNormalize';

function extractChatJid(rawValue: string): string {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (raw.includes('@g.us')) return raw;
  const digits = raw.split(':')[0].split('@')[0].replace(/\D/g, '');
  if (!digits) return '';
  return `${digits}@s.whatsapp.net`;
}

function normalizeConnectedPhone(value: string): string {
  return normalizePhone(String(value || '').split(':')[0].split('@')[0]);
}

/**
 * QR Chat webhook receiver.
 *
 * This endpoint is meant for waofficialapi.in (or similar) providers that forward WhatsApp Web events.
 * Keep this pipeline separate from Meta Cloud WhatsApp ("Meta chat").
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Accept multiple secret header names for backwards compatibility
    const secret = (process.env.QR_CHAT_WEBHOOK_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || process.env.WHATSAPP_WEB_BRIDGE_SECRET || '').trim();
    if (secret) {
      const received = req.headers.get('x-qr-chat-secret') || req.headers.get('x-webhook-secret') || req.headers.get('x-bridge-secret') || '';
      if (received !== secret) {
        return apiError('UNAUTHORIZED', 'Unauthorized webhook');
      }
    }

    const bodyText = await req.text();
    let payload: any = {};
    try {
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      payload = { raw: bodyText };
    }

    // Prefer bridge user identity from verified headers over body payload (defense-in-depth).
    const headerUserId = req.headers.get('x-user-id')?.trim();
    const headerSessionKey = req.headers.get('x-session-key')?.trim();
    if (headerUserId) payload.bridgeUserId = headerUserId;
    if (headerSessionKey && !payload.bridgeSessionId) payload.bridgeSessionId = headerSessionKey;

    // ── Delivery / read receipts (ticks) ──
    // The bridge forwards { type: 'status_update', messageId, status } whenever a sent
    // message progresses (server_ack → delivery_ack → read). Persist it so ticks survive
    // a bridge restart / PC off instead of reverting to a single grey tick. Handled before
    // the forensic log below so high-frequency receipts don't flood the events collection.
    if (payload?.type === 'status_update' || payload?.event === 'message_status') {
      const result = await applyQrStatusUpdate(payload, payload.bridgeUserId);
      return apiSuccess({ ok: true, ...result });
    }

    // Store raw events first for forensics.
    await logQREvent({
      kind: 'unknown',
      ok: true,
      message: 'QR_CHAT_WEBHOOK_RECEIVED',
      sample: {
        route: '/api/whatsapp/qr/webhook',
        payload,
      },
    });

    // Debug: Log webhook headers
    console.log(`[QR WEBHOOK] ════════════════════════════════════════`);
    console.log(`[QR WEBHOOK] User ID: ${headerUserId || 'NOT PROVIDED'}`);
    console.log(`[QR WEBHOOK] Session Key: ${headerSessionKey || 'NOT PROVIDED'}`);
    console.log(`[QR WEBHOOK] Bridge User ID (payload): ${payload.bridgeUserId || 'NOT SET'}`);
    console.log(`[QR WEBHOOK] ════════════════════════════════════════`);

    // Best-effort ingestion into CRM WhatsAppMessage.
    // We keep this intentionally tolerant because QR providers differ in payload shape.
    const ingested = await ingestQRPayload(payload);

    return apiSuccess({ ok: true, ...ingested, ...(ingested.mediaUrl && { mediaUrl: ingested.mediaUrl }) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError('SERVER_ERROR', message);
  }
}

/**
 * Persist a delivery/read receipt to the QR message stores, only ever upgrading the tick
 * (receipts can arrive out of order). Status is the numeric Baileys code used by the inbox:
 * 1=pending, 2=sent (server_ack), 3=delivered (delivery_ack), 4=read, 5=played.
 */
async function applyQrStatusUpdate(payload: any, bridgeUserId?: string) {
  const messageId = String(payload.messageId || payload.id || '').trim();
  if (!messageId) return { skipped: true, reason: 'no_messageId' };

  const raw = payload.status ?? payload.ack;
  let numeric: number | null = null;
  if (typeof raw === 'number') {
    numeric = raw;
  } else if (typeof raw === 'string') {
    const map: Record<string, number> = {
      pending: 1, sent: 2, server_ack: 2, delivered: 3, delivery_ack: 3, read: 4, played: 5,
    };
    numeric = map[raw.toLowerCase()] ?? null;
  }
  // Only persist real progression (sent/delivered/read/played). 0/1 carry no tick info.
  if (numeric == null || numeric < 2) return { skipped: true, reason: 'unmapped_status' };

  await connectDB();
  const { getQrWhatsAppMessage, getWhatsAppMessage, getBroadcastRunMessage } = await import('@/lib/schemas/enterpriseSchemas');
  const QrWhatsAppMessage = getQrWhatsAppMessage();
  const WhatsAppMessage = getWhatsAppMessage();
  const BroadcastRunMessage = getBroadcastRunMessage();

  // qr_whatsapp_messages: numeric status, never downgrade.
  const qrFilter: any = { messageId, status: { $lt: numeric } };
  if (bridgeUserId) qrFilter.userId = bridgeUserId;
  const qrRes = await QrWhatsAppMessage.updateMany(qrFilter, { $set: { status: numeric } });

  // Mirror to the unified WhatsAppMessage store (string status) for the combined inbox.
  const strStatus = numeric >= 4 ? 'read' : numeric === 3 ? 'delivered' : 'sent';
  const waSet: any = { status: strStatus };
  if (numeric >= 4) waSet.readAt = new Date();
  else if (numeric === 3) waSet.deliveredAt = new Date();
  await WhatsAppMessage.updateOne({ waMessageId: messageId }, { $set: waSet });

  // Mirror to BroadcastRunMessage so QR broadcast reports reflect delivery/read
  // ticks (previously only WhatsAppMessage was updated, so reports stayed on
  // "sent" forever). Never downgrade an already-higher status.
  const statusRank: Record<string, number> = { pending: 0, sending: 0, sent: 1, delivered: 2, read: 3 };
  const broadcastSet: any = { status: strStatus, updatedAt: new Date() };
  if (numeric === 3) broadcastSet.deliveredAt = new Date();
  if (numeric >= 4) { broadcastSet.deliveredAt = new Date(); broadcastSet.readAt = new Date(); }
  const lowerStatuses = Object.keys(statusRank).filter((s) => statusRank[s] < statusRank[strStatus]);
  await BroadcastRunMessage.updateOne(
    { waMessageId: messageId, status: { $in: lowerStatuses } },
    { $set: broadcastSet }
  );

  return { updated: qrRes.modifiedCount || 0, status: numeric };
}

async function ingestQRPayload(payload: any) {
  const messages = normalizeQRIncomingMessages(payload);
  if (!messages.length) {
    return { count: 0, reason: 'no_messages_detected' };
  }

  console.log(`[QR WEBHOOK] Ingesting ${messages.length} message(s)`);

  await connectDB();

  const {
    getWhatsAppMessage,
    getLead,
    getCRMUserSettings,
    getQrWhatsAppMessage,
    getQrWhatsAppChat,
  } = await import('@/lib/schemas/enterpriseSchemas');
  const { isValidPhoneNumber } = await import('@/lib/whatsapp');
  const { uploadToS3 } = await import('@/lib/bunny-storage');
  const WhatsAppMessage = getWhatsAppMessage();
  const Lead = getLead();
  const CRMUserSettings = getCRMUserSettings();
  const QrWhatsAppMessage = getQrWhatsAppMessage();
  const QrWhatsAppChat = getQrWhatsAppChat();

  const bridgeUserId = String(payload.bridgeUserId || '').trim();
  const bridgeSettings = bridgeUserId
    ? await CRMUserSettings.findOne({ userId: bridgeUserId }, { qrConnectedPhoneNumber: 1 }).lean()
    : null;
  // connectedPhone priority:
  // 1. Bridge sends it explicitly (added to forwardToWebhook payload)
  // 2. Stored in CRMUserSettings after QR scan
  // 3. For inbound messages, bridge sets `to` = our phone number (fallback)
  const inboundFallbackPhone = !payload.fromMe && payload.to ? normalizeConnectedPhone(String(payload.to)) : '';
  const connectedPhone = normalizeConnectedPhone(
    payload.connectedPhone ||
    (bridgeSettings as any)?.qrConnectedPhoneNumber ||
    inboundFallbackPhone ||
    ''
  );

  let created = 0;
  let skippedInvalidPhone = 0;
  let mediaProcessed = 0;
  let lastMediaUrl: string | undefined;
  
  for (const m of messages) {
    const text = (m.text || '').trim();
    const hasMedia = m.hasMedia && m.media;
    
    // Allow messages with media even if no text
    if (!text && !hasMedia) continue;

    const fromPhone = m.fromMe ? (m.to || m.from) : m.from;
    const normalizedPhone = normalizePhone(fromPhone);
    
    // Validate phone number - skip if it looks invalid (e.g., timestamp, group ID)
    if (!isValidPhoneNumber(normalizedPhone)) {
      console.warn(`[QR WEBHOOK] Skipping invalid phone: ${fromPhone} -> ${normalizedPhone}`);
      skippedInvalidPhone++;
      continue;
    }

    // Determine message type
    const messageType = hasMedia ? 'media' : 'text';
    const messageContent = text || (hasMedia ? `[${m.media?.kind || 'media'} message]` : '');

    const messageTimestamp = m.timestamp || new Date();
    const doc: any = {
      provider: 'whatsapp_web_bridge', // Unified provider for all QR/Bridge messages
      direction: m.fromMe ? 'outbound' : 'inbound',
      phoneNumber: normalizedPhone,
      messageContent,
      messageType,
      status: 'delivered',
      waMessageId: m.messageId,
      sentAt: messageTimestamp,
      timestamp: messageTimestamp,
      // Tag with bridge user for multi-user session isolation
      ...(payload.bridgeUserId && { bridgeUserId: payload.bridgeUserId, ownerId: payload.bridgeUserId }),
      // Keep raw/provider details in metadata.
      metadata: {
        channel: 'qr',
        rawProvider: 'waofficialapi',
        instanceId: process.env.QR_CHAT_INSTANCE_ID || undefined,
        to: m.to,
        bridgeUserId: payload.bridgeUserId || undefined,
      },
    };

    // Handle media - upload to S3 if we have base64 data or URL
    if (hasMedia && m.media) {
      let s3MediaUrl: string | undefined;
      let mediaError: string | undefined;
      
      try {
        if (m.media.base64) {
          // Upload base64 data to S3
          console.log(`[QR WEBHOOK] Processing base64 media: ${m.media.kind}`);
          const buffer = Buffer.from(m.media.base64, 'base64');
          const extension = m.media.mimetype?.split('/')[1]?.split(';')[0] || 
                           (m.media.kind === 'image' ? 'jpg' : 
                            m.media.kind === 'video' ? 'mp4' : 
                            m.media.kind === 'audio' ? 'mp3' : 'bin');
          const fileName = `whatsapp-qr-inbound/${normalizedPhone}/${Date.now()}.${extension}`;
          
          s3MediaUrl = await uploadToS3(buffer, fileName, {
            metadata: {
              'wa-message-id': m.messageId || '',
              'phone-number': normalizedPhone,
              'media-type': m.media.kind,
              'direction': doc.direction,
              'source': 'qr-bridge'
            }
          });
          console.log(`[QR WEBHOOK] ✅ Uploaded to S3: ${s3MediaUrl}`);
          lastMediaUrl = s3MediaUrl;
          mediaProcessed++;
        } else if (m.media.url) {
          // Use existing URL directly (may need to re-upload for permanence)
          s3MediaUrl = m.media.url;
          lastMediaUrl = s3MediaUrl;
          console.log(`[QR WEBHOOK] Using existing media URL: ${s3MediaUrl}`);
        }
      } catch (uploadErr: any) {
        mediaError = uploadErr?.message || 'Failed to upload media';
        console.error('[QR WEBHOOK] Media upload error:', mediaError);
      }

      doc.media = {
        kind: m.media.kind,
        url: s3MediaUrl || null,
        mimeType: m.media.mimetype || null,
        fileName: m.media.filename || null,
        error: mediaError || null,
      };
    }

    // Avoid duplicates when provider provides a stable id.
    if (m.messageId) {
      const existing = await WhatsAppMessage.findOne({
        provider: { $in: ['whatsapp_web_bridge', 'whatsapp_qr'] },
        waMessageId: m.messageId,
      }).select({ _id: 1 });
      if (existing) continue;
    }

    // Check for existing lead — TENANT-SCOPED. The same phone number can be a
    // lead for MANY tenants (SaaS): only match the bridge user's OWN lead, never
    // attach this tenant's message to another tenant's lead.
    const leadLookup: any = { phoneNumber: normalizedPhone };
    if (bridgeUserId) {
      leadLookup.$or = [
        { assignedToUserId: bridgeUserId },
        { createdByUserId: bridgeUserId },
      ];
    }
    let lead = await Lead.findOne(leadLookup);
    const senderName = !m.fromMe && m.pushName ? String(m.pushName).trim() : '';
    if (!lead) {
        // Auto-create lead for incoming messages if it doesn't exist
        const { leadNumber } = await allocateNextLeadNumber(bridgeUserId || undefined);
        lead = await Lead.create({
            phoneNumber: normalizedPhone,
            name: senderName || normalizedPhone,
            source: 'qr_whatsapp',
            labels: ['whatsapp', 'qr'],
            status: 'lead',
            leadNumber,
            // Assign to the bridge user who received the message
            ...(bridgeUserId && {
              assignedToUserId: bridgeUserId,
              createdByUserId: bridgeUserId,
            }),
        });
        console.log(`[QR WEBHOOK] Created lead for ${normalizedPhone} (name: ${senderName || 'none'}), assigned to: ${bridgeUserId || 'UNASSIGNED'}`);
    } else {
        const updates: any = {};
        // Add 'whatsapp' label if not already there
        if (!lead.labels || !lead.labels.includes('whatsapp')) updates.$addToSet = { labels: 'whatsapp' };
        // Update name if it's still the raw phone number and we now have a real name
        if (senderName && (!lead.name || lead.name === normalizedPhone)) updates.$set = { name: senderName };
        if (Object.keys(updates).length) await Lead.updateOne({ _id: lead._id }, updates);
        console.log(`[QR WEBHOOK] Found existing lead for ${normalizedPhone}, owned by: ${(lead as any).assignedToUserId || (lead as any).createdByUserId || 'UNASSIGNED'}`);
    }
    
    doc.leadId = lead._id;

    const newMessage = await WhatsAppMessage.create(doc);
    created++;

    if (bridgeUserId && connectedPhone) {
      const chatJid = extractChatJid(m.fromMe ? (m.to || m.from) : m.from);
      const timestampMs = m.timestamp instanceof Date ? m.timestamp.getTime() : Date.now();
      const timestampSeconds = Math.floor(timestampMs / 1000);

      if (chatJid && m.messageId) {
        // Use atomic findOneAndUpdate to prevent race condition duplicates
        try {
          await QrWhatsAppMessage.findOneAndUpdate(
            { messageId: m.messageId, userId: bridgeUserId, connectedPhone },
            {
              $set: {
                userId: bridgeUserId,
                connectedPhone,
                chatJid,
                direction: m.fromMe ? 'outbound' : 'inbound',
                fromMe: !!m.fromMe,
                text: messageContent,
                type: m.media?.kind || m.type || 'text',
                participant: '',
                pushName: typeof lead.name === 'string' ? lead.name : '',
                timestamp: timestampSeconds,
                status: m.fromMe ? 2 : 0,
                hasMedia: !!hasMedia,
                mediaUrl: doc.media?.url || '',
                mediaMimetype: doc.media?.mimeType || '',
                mediaFileName: doc.media?.fileName || '',
                quotedId: '',
                quotedText: '',
                quotedParticipant: '',
                rawMessage: payload,
                metadata: doc.metadata,
              },
              $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true, new: true }
          );
        } catch (err: any) {
          // Handle duplicate key error (should be rare with upsert, but log just in case)
          if (err.code === 11000) {
            console.log(`[QR WEBHOOK] Duplicate message ignored: ${m.messageId}`);
          } else {
            throw err;
          }
        }

        // Update chat thread (only if messageId exists to avoid duplicates)
        if (m.messageId) {
          // Only overwrite the chat name when the lead has a REAL name — never
          // stomp a previously harvested contact name with bare phone digits.
          const leadName = typeof lead.name === 'string' ? lead.name.trim() : '';
          const hasRealLeadName = !!leadName && !/^\d+$/.test(leadName);
          await QrWhatsAppChat.findOneAndUpdate(
            { userId: bridgeUserId, connectedPhone, chatJid },
            {
              $set: {
                userId: bridgeUserId,
                connectedPhone,
                chatJid,
                ...(hasRealLeadName ? { name: leadName } : {}),
                isGroup: chatJid.endsWith('@g.us'),
                lastMessage: messageContent,
                lastMessageTime: new Date(timestampMs),
                lastMessageFromMe: !!m.fromMe,
                conversationTimestamp: timestampSeconds,
              },
              $setOnInsert: {
                // Do NOT set unreadCount here — $inc below handles it
                // (having both $setOnInsert.unreadCount + $inc.unreadCount causes MongoDB conflict)
                ...(hasRealLeadName ? {} : { name: normalizedPhone }),
                pinned: false,
                archived: false,
                profilePicUrl: '',
                createdAt: new Date(),
              },
              // For inbound: increment unreadCount ($inc auto-initializes to 0 if field missing)
              // For outbound: don't touch unreadCount
              ...(m.fromMe ? {} : { $inc: { unreadCount: 1 } }),
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    // Trigger QR-specific chatbot flows + automation rules for inbound messages only.
    // Both send via EC2 Baileys bridge — never touch Meta Cloud API.
    if (!m.fromMe && bridgeUserId && lead?._id) {
      const msgText = text || messageContent;
      const isFirstInbound = created === 1 && !m.fromMe; // rough heuristic: first message we stored

      try {
        const { triggerQrChatbotFlow } = await import('@/lib/qrChatbotExecutor');
        await triggerQrChatbotFlow({
          userId: bridgeUserId,
          leadId: String(lead._id),
          phoneNumber: normalizedPhone,
          messageText: msgText,
          connectedPhone: connectedPhone || '',
        });
      } catch (chatbotErr: any) {
        console.warn('[QR WEBHOOK] QR chatbot trigger failed (non-fatal):', chatbotErr.message);
      }

      try {
        const { handleQrInboundAutomations } = await import('@/lib/qrAutomationHandler');
        await handleQrInboundAutomations({
          userId: bridgeUserId,
          leadId: String(lead._id),
          phoneNumber: normalizedPhone,
          messageText: msgText,
          wasFirstInbound: isFirstInbound,
          connectedPhone: connectedPhone || '',
        });
      } catch (autoErr: any) {
        console.warn('[QR WEBHOOK] QR automation failed (non-fatal):', autoErr.message);
      }
    }
  }

  return { count: created, skippedInvalidPhone, mediaProcessed, mediaUrl: lastMediaUrl };
}

async function logQREvent(event: {
  kind: 'unknown' | 'error';
  ok?: boolean;
  message?: string;
  sample?: any;
}) {
  try {
    await connectDB();

    const { getWhatsAppWebhookEvent } = await import('@/lib/schemas/enterpriseSchemas');
    const WhatsAppWebhookEvent = getWhatsAppWebhookEvent();

    await WhatsAppWebhookEvent.create({
      source: 'qr',
      kind: event.kind,
      ok: event.ok ?? true,
      message: event.message,
      sample: {
        ...(event.sample ? { payload: event.sample } : {}),
        channel: 'qr',
        provider: 'waofficialapi',
        instanceId: process.env.QR_CHAT_INSTANCE_ID || undefined,
      },
      receivedAt: new Date(),
    });
  } catch (e) {
    console.error('[QR CHAT] Failed to log webhook event:', e);
  }
}

export async function GET() {
  // Provider might use GET for verification/ping
  return apiSuccess({ ok: true, channel: 'qr' });
}
