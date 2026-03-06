import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
// NOTE: handleInboundWhatsAppAutomations intentionally NOT imported here.
// QR inbound messages must NOT trigger Meta Cloud API automations/auto-replies
// to prevent QR contacts from appearing in the Meta inbox.
import { normalizeQRIncomingMessages } from '@/lib/qrWebhookNormalize';

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

  await connectDB();

  const { getWhatsAppMessage, getLead } = await import('@/lib/schemas/enterpriseSchemas');
  const { isValidPhoneNumber } = await import('@/lib/whatsapp');
  const { uploadToS3 } = await import('@/lib/bunny-storage');
  const WhatsAppMessage = getWhatsAppMessage();
  const Lead = getLead();

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

    const doc: any = {
      provider: 'whatsapp_web_bridge', // Unified provider for all QR/Bridge messages
      direction: m.fromMe ? 'outbound' : 'inbound',
      phoneNumber: normalizedPhone,
      messageContent,
      messageType,
      status: 'delivered',
      waMessageId: m.messageId,
      // sentAt is used widely for sorting.
      sentAt: m.timestamp || new Date(),
      // Keep raw/provider details in metadata.
      metadata: {
        channel: 'qr',
        rawProvider: 'waofficialapi',
        instanceId: process.env.QR_CHAT_INSTANCE_ID || undefined,
        to: m.to,
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

    // Check for existing lead or match
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
        // Auto-create lead for incoming messages if it doesn't exist
        const { leadNumber } = await allocateNextLeadNumber();
        lead = await Lead.create({
            phoneNumber: normalizedPhone,
            name: `QR Lead ${normalizedPhone}`,
            source: 'qr_whatsapp',
            labels: ['whatsapp', 'qr'],
            status: 'lead',
            leadNumber
        });
    } else {
        // Add 'whatsapp' label if not already there
        if (!lead.labels || !lead.labels.includes('whatsapp')) {
            await Lead.updateOne(
                { _id: lead._id },
                { $addToSet: { labels: 'whatsapp' } }
            );
        }
    }
    
    doc.leadId = lead._id;

    const newMessage = await WhatsAppMessage.create(doc);
    created++;

    // SKIP automations for QR inbound messages.
    // The automation system sends replies via Meta Cloud API, which creates
    // provider:'meta' messages and pollutes the Meta inbox with QR contacts.
    // QR bridge messages must stay completely separate from the Meta pipeline.
    // If QR-specific automations are needed in the future, implement a
    // separate handler that sends via the QR bridge (Baileys) instead.
    // ──────────────────────────────────────────────────────────────────
    // (previously: handleInboundWhatsAppAutomations was called here)
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
