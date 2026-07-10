import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
// NOTE: handleInboundWhatsAppAutomations intentionally NOT imported here.
// QR inbound messages must NOT trigger Meta Cloud API automations/auto-replies
// to prevent QR contacts from appearing in the Meta inbox.
import { normalizeQRIncomingMessages, normalizeQRChatJid, resolveQRContactPhone } from '@/lib/qrWebhookNormalize';
import { QR_MESSAGE_STATUS } from '@/lib/qrMessageStatus';
import { applyQrStatusUpdate } from '@/lib/qrStatusUpdates';

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

    const sourceJid = m.chatJid || (m.fromMe ? (m.to || m.from) : m.from);
    // `sourceJid` identifies the conversation, but an @lid value is not a
    // dialable phone number. The bridge already resolves `m.from` to the real
    // sender phone; use that for lead lookup/validation while retaining the
    // original JID for message persistence.
    const fromPhone = resolveQRContactPhone(m, sourceJid);
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
      status: m.fromMe ? 'sent' : 'received',
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
        sessionKey: payload.bridgeSessionId || undefined,
        tenantId: payload.bridgeTenantId || undefined,
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
      const chatJid = normalizeQRChatJid(sourceJid);
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
                participant: m.participant || '',
                pushName: typeof lead.name === 'string' ? lead.name : '',
                timestamp: timestampSeconds,
                status: m.fromMe ? QR_MESSAGE_STATUS.SENT : QR_MESSAGE_STATUS.PENDING,
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

      // ── OPT-OUT COMPLIANCE (runs before chatbot/automations) ──
      // STOP/UNSUBSCRIBE adds the sender to the tenant's opt-out list and
      // confirms; START opts back in. Either way the command message itself
      // must not trigger chatbot flows or automation rules. An already
      // opted-out contact is also excluded from all automated replies.
      try {
        const { handleQrOptOutKeyword, isOptedOut } = await import('@/lib/qrOptOut');
        const wasOptCommand = await handleQrOptOutKeyword({
          userId: bridgeUserId,
          phoneNumber: normalizedPhone,
          chatJid,
          messageText: msgText,
        });
        if (wasOptCommand || (await isOptedOut(bridgeUserId, normalizedPhone))) {
          continue;
        }
      } catch (optErr: any) {
        console.warn('[QR WEBHOOK] Opt-out check failed (non-fatal):', optErr.message);
      }

      // ── DRIP STOP-ON-REPLY (runs before CSAT so a rating reply also stops journeys) ──
      try {
        const { getQrDripEnrollment } = await import('@/lib/schemas/enterpriseSchemas');
        await getQrDripEnrollment().updateMany(
          { userId: bridgeUserId, phone: normalizedPhone, status: 'active', stopOnReply: true },
          { $set: { status: 'stopped', stoppedReason: 'replied' } }
        );
      } catch (dripErr: any) {
        console.warn('[QR WEBHOOK] Drip stop-on-reply failed (non-fatal):', dripErr.message);
      }

      // ── CSAT RATING CAPTURE ──
      // A bare 1-5 reply within 48h of a pending rating request is the
      // customer's rating: record it, thank them, and don't let the digit
      // trigger chatbot flows or keyword automations.
      const csatRating = /^[1-5]$/.test(msgText.trim()) ? parseInt(msgText.trim(), 10) : null;
      if (csatRating !== null) {
        try {
          const { getQrCsat } = await import('@/lib/schemas/enterpriseSchemas');
          const QrCsat = getQrCsat();
          const pending = await QrCsat.findOneAndUpdate(
            {
              userId: bridgeUserId,
              phone: normalizedPhone,
              rating: { $exists: false },
              sentAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
            },
            { $set: { rating: csatRating, ratedAt: new Date() } },
            { sort: { sentAt: -1 } }
          );
          if (pending) {
            try {
              const { resolveQrTenantBridge, isQrTenantConnected, sendQrTenantMessage } = await import('@/lib/qrTenantBridge');
              const session = await resolveQrTenantBridge(bridgeUserId);
              if (session && (await isQrTenantConnected(session))) {
                await sendQrTenantMessage(session, {
                  to: `${normalizedPhone}@s.whatsapp.net`,
                  type: 'text',
                  message: 'Thank you for your feedback! 🙏',
                });
              }
            } catch { /* thank-you is best-effort */ }
            continue; // rating captured — skip chatbot/automations for this digit
          }
        } catch (csatErr: any) {
          console.warn('[QR WEBHOOK] CSAT capture failed (non-fatal):', csatErr.message);
        }
      }

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
