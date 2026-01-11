import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { handleInboundWhatsAppAutomations } from '@/lib/whatsappAutomation';

/**
 * QR Chat webhook receiver.
 *
 * This endpoint is meant for waofficialapi.in (or similar) providers that forward WhatsApp Web events.
 * Keep this pipeline separate from Meta Cloud WhatsApp ("Meta chat").
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const secret = (process.env.QR_CHAT_WEBHOOK_SECRET || '').trim();
    if (secret) {
      const received = req.headers.get('x-qr-chat-secret') || req.headers.get('x-webhook-secret') || '';
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

type NormalizedQRMessage = {
  from: string;
  to?: string;
  text?: string;
  messageId?: string;
  timestamp?: Date;
};

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return undefined;
}

function normalizeIncomingMessages(payload: any): NormalizedQRMessage[] {
  const list: any[] =
    (Array.isArray(payload?.messages) && payload.messages) ||
    (Array.isArray(payload?.data?.messages) && payload.data.messages) ||
    (Array.isArray(payload?.message) && payload.message) ||
    (payload?.message && typeof payload.message === 'object' ? [payload.message] : []);

  if (!list.length) {
    // Common single-message shapes
    if (payload?.from || payload?.sender || payload?.phone) {
      return [payload].map((m) => ({
        from: asString(m.from || m.sender || m.phone) || '',
        to: asString(m.to || m.receiver),
        text: asString(m.text || m.body || m.message || m?.content?.text),
        messageId: asString(m.id || m.messageId || m.msgId),
        timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
      })).filter((m) => !!m.from);
    }
    return [];
  }

  return list
    .map((m) => {
      const text =
        asString(m.text) ||
        asString(m.body) ||
        asString(m.message) ||
        asString(m?.content?.text) ||
        asString(m?.text?.body);

      const tsRaw = m.timestamp ?? m.ts ?? m.time ?? m.createdAt;
      let timestamp: Date | undefined;
      if (typeof tsRaw === 'number') {
        // providers may send seconds or ms - handle both
        timestamp = new Date(tsRaw < 10_000_000_000 ? tsRaw * 1000 : tsRaw);
      } else if (typeof tsRaw === 'string' && tsRaw) {
        const n = Number(tsRaw);
        if (!Number.isNaN(n)) {
          timestamp = new Date(n < 10_000_000_000 ? n * 1000 : n);
        } else {
          const d = new Date(tsRaw);
          if (!Number.isNaN(d.getTime())) timestamp = d;
        }
      }

      return {
        from: asString(m.from || m.sender || m.phone || m?.contact?.id || m?.chatId) || '',
        to: asString(m.to || m.receiver),
        text,
        messageId: asString(m.id || m.messageId || m.msgId || m?.key?.id),
        timestamp,
      } as NormalizedQRMessage;
    })
    .filter((m) => !!m.from);
}

async function ingestQRPayload(payload: any) {
  const messages = normalizeIncomingMessages(payload);
  if (!messages.length) {
    return { count: 0, reason: 'no_messages_detected' };
  }

  await connectDB();

  const { getWhatsAppMessage, getLead } = await import('@/lib/schemas/enterpriseSchemas');
  const WhatsAppMessage = getWhatsAppMessage();
  const Lead = getLead();

  let created = 0;
  for (const m of messages) {
    const text = (m.text || '').trim();
    if (!text) continue;

    const normalizedPhone = normalizePhone(m.from);

    const doc: any = {
      provider: 'whatsapp_qr',
      direction: 'inbound',
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
        provider: 'whatsapp_qr',
        waMessageId: m.messageId,
        direction: 'inbound',
      }).select({ _id: 1 });
      if (existing) continue;
    }

    // Check for existing lead or match
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
        // Auto-create lead for incoming messages if it doesn't exist
        lead = await Lead.create({
            phoneNumber: normalizedPhone,
            name: `QR Lead ${normalizedPhone}`,
            source: 'whatsapp_qr',
            status: 'Leads'
        });
    }
    
    doc.leadId = lead._id;

    const newMessage = await WhatsAppMessage.create(doc);
    created++;

    // TRIGGER AUTOMATIONS (Chatbot, Auto-replies, etc.)
    if (text) {
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

  return { count: created };
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
