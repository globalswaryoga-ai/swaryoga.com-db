import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { handleInboundWhatsAppAutomations } from '@/lib/whatsappAutomation';
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

    return apiSuccess({ ok: true, ingested });
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
  const WhatsAppMessage = getWhatsAppMessage();
  const Lead = getLead();

  let created = 0;
  let skippedInvalidPhone = 0;
  
  for (const m of messages) {
    const text = (m.text || '').trim();
    if (!text) continue;

    const fromPhone = m.fromMe ? (m.to || m.from) : m.from;
    const normalizedPhone = normalizePhone(fromPhone);
    
    // Validate phone number - skip if it looks invalid (e.g., timestamp, group ID)
    if (!isValidPhoneNumber(normalizedPhone)) {
      console.warn(`[QR WEBHOOK] Skipping invalid phone: ${fromPhone} -> ${normalizedPhone}`);
      skippedInvalidPhone++;
      continue;
    }

    const doc: any = {
      provider: 'whatsapp_web_bridge', // Unified provider for all QR/Bridge messages
      direction: m.fromMe ? 'outbound' : 'inbound',
      phoneNumber: normalizedPhone,
      messageContent: text,
      messageType: 'text',
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
            source: 'whatsapp',
            labels: ['whatsapp'],
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

    // TRIGGER AUTOMATIONS (Chatbot, Auto-replies, etc.)
    if (text && doc.direction === 'inbound') {
      try {
        // Check if this is the first inbound message in recent history (e.g. 24h)
        const count = await WhatsAppMessage.countDocuments({
          leadId: lead._id,
          direction: 'inbound',
          sentAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        await handleInboundWhatsAppAutomations({
          leadId: lead._id,
          phoneNumber: normalizedPhone,
          messageBody: text,
          wasFirstInbound: count <= 1 // Including current one
        });
      } catch (autoErr) {
        console.error('[QR WEBHOOK AUTOMATION ERROR]:', autoErr);
      }
    }
  }

  return { count: created, skippedInvalidPhone };
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
