import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { Lead, WhatsAppMessage, WhatsAppWebhookEvent } from '@/lib/schemas/enterpriseSchemas';
import { handleInboundWhatsAppAutomations } from '@/lib/whatsappAutomation';

import { normalizePhone as normalizePhoneDigits } from '@/lib/whatsapp';

function normalizePhone(raw: string): string {
  // Keep local helper for backward-compat, but delegate to shared digits-only normalizer.
  return normalizePhoneDigits(raw);
}

function extractTextMessageBody(msg: any): string {
  const type = String(msg?.type || '');
  if (type === 'text') return String(msg?.text?.body || '').trim();
  // For now, store a compact representation for non-text.
  return type ? `[${type} message]` : '';
}

type WebhookStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: any[];
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set' },
      { status: 500 }
    );
  }

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    // Meta expects the raw challenge string.
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    // Recommended: verify Meta webhook signature if APP_SECRET is available.
    // This protects against random internet POSTs that would otherwise be accepted.
    const appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();
    if (appSecret) {
      const signatureHeader = request.headers.get('x-hub-signature-256') || '';
      // Expected format: "sha256=<hex>"
      const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice('sha256='.length) : '';
      if (!provided) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Missing x-hub-signature-256',
        });
        return NextResponse.json({ error: 'Missing x-hub-signature-256' }, { status: 401 });
      }

      // Basic validation: invalid hex or wrong length should fail safely.
      if (provided.length !== 64 || !/^[0-9a-fA-F]+$/.test(provided)) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature format',
        });
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }

      const rawBody = await request.text();
      const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
      // timingSafeEqual throws if buffer lengths differ, so keep it defensive.
      const providedBuf = Buffer.from(provided, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      if (providedBuf.length !== expectedBuf.length) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature length',
        });
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
      const ok = crypto.timingSafeEqual(providedBuf, expectedBuf);
      if (!ok) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature (HMAC mismatch)',
        });
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }

      // Re-parse the JSON from the already-read raw body.
      const payload = JSON.parse(rawBody);
      // Continue below using this payload.
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return await handleWebhookPayload(payload);
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      await logWebhookEvent({
        kind: 'error',
        ok: false,
        message: 'Invalid JSON body',
      });
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    return await handleWebhookPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler error';

    // Avoid throwing here; webhook responses must be fast and resilient.
    console.error('WhatsApp webhook processing failed:', message);

    await logWebhookEvent({
      kind: 'error',
      ok: false,
      message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function logWebhookEvent(event: {
  kind: 'verify' | 'inbound_message' | 'status_update' | 'error' | 'unknown';
  ok?: boolean;
  message?: string;
  phoneNumber?: string;
  waMessageId?: string;
  status?: string;
  sample?: any;
}) {
  try {
    // This route should be resilient: never break the webhook path due to logging.
    await connectDB();
    await WhatsAppWebhookEvent.create({
      source: 'meta',
      kind: event.kind,
      ok: event.ok ?? true,
      message: event.message,
      phoneNumber: event.phoneNumber,
      waMessageId: event.waMessageId,
      status: event.status,
      sample: event.sample,
      receivedAt: new Date(),
    });
  } catch {
    // swallow
  }
}

async function handleWebhookPayload(payload: any) {
  try {

    // Meta sends events with object: 'whatsapp_business_account'.
    // We accept others too, but ignore unknown shapes safely.
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    if (entries.length === 0) {
      await logWebhookEvent({
        kind: 'unknown',
        ok: true,
        message: 'No entries in webhook payload',
        sample: {
          object: payload?.object,
          hasEntry: Array.isArray(payload?.entry),
        },
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    await connectDB();

    const now = new Date();

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;

        // 1) Status updates for messages we previously sent
        const statuses: WebhookStatus[] = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const st of statuses) {
          const waMessageId = String(st?.id || '').trim();
          if (!waMessageId) continue;

          const status = String(st?.status || '').toLowerCase();
          const update: any = { updatedAt: now };

          if (status === 'sent') update.status = 'sent';
          if (status === 'delivered') {
            update.status = 'delivered';
            update.deliveredAt = now;
          }
          if (status === 'read') {
            update.status = 'read';
            update.readAt = now;
          }
          if (status === 'failed') {
            update.status = 'failed';
            const err = Array.isArray(st?.errors) ? st.errors[0] : undefined;
            const msg = err?.title || err?.message || err?.error_data?.details;
            update.failureReason = msg ? String(msg) : 'Failed';
          }

          // We may store Meta's id in different fields depending on the send path.
          await WhatsAppMessage.updateOne(
            { $or: [{ waMessageId }, { externalMessageId: waMessageId }] },
            { $set: update }
          );

          await logWebhookEvent({
            kind: 'status_update',
            ok: true,
            waMessageId,
            status,
            phoneNumber: st?.recipient_id ? normalizePhone(String(st.recipient_id)) : undefined,
            sample: {
              ts: st?.timestamp,
              hasErrors: Array.isArray(st?.errors) && st.errors.length > 0,
            },
          });
        }

        // 2) Inbound messages (from user to us)
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const msg of messages) {
          const from = normalizePhone(String(msg?.from || ''));
          if (!from) continue;

          const body = extractTextMessageBody(msg);
          if (!body) continue;

          const inboundWaMessageId = msg?.id ? String(msg.id).trim() : '';

          await logWebhookEvent({
            kind: 'inbound_message',
            ok: true,
            phoneNumber: from,
            waMessageId: msg?.id ? String(msg.id) : undefined,
            sample: {
              type: msg?.type,
              ts: msg?.timestamp,
              // store tiny preview to avoid PII bloat
              preview: body.slice(0, 80),
            },
          });

          // Ensure a Lead exists
          let lead: { _id: unknown } | null = (await Lead.findOne({ phoneNumber: from }).lean()) as { _id: unknown } | null;
          if (!lead) {
            const created = await Lead.create({
              phoneNumber: from,
              source: 'whatsapp',
              status: 'lead',
              lastMessageAt: now,
            });
            lead = created.toObject() as { _id: unknown };
          } else {
            await Lead.updateOne({ _id: lead._id }, { $set: { lastMessageAt: now, updatedAt: now } });
          }

          if (!lead?._id) continue;

          // Detect if this is the first inbound message for welcome automation.
          const previousInbound = await WhatsAppMessage.findOne({ leadId: lead._id, direction: 'inbound' })
            .sort({ sentAt: -1 })
            .lean();
          const wasFirstInbound = !previousInbound;

          // Handle STOP/OPTOUT keywords
          const keyword = body.trim().toUpperCase();
          if (keyword === 'STOP' || keyword === 'UNSUBSCRIBE' || keyword === 'OPTOUT') {
            await ConsentManager.handleUnsubscribeKeyword(from, keyword as any);
          }

          // Store inbound as a WhatsAppMessage record for a unified thread view.
          // Idempotency: Meta retries webhooks. Prevent duplicate inbound rows by upserting on waMessageId.
          // If Meta doesn't provide an id (rare), we fall back to create (best-effort).
          if (inboundWaMessageId) {
            await WhatsAppMessage.updateOne(
              { waMessageId: inboundWaMessageId, direction: 'inbound' },
              {
                $setOnInsert: {
                  leadId: lead._id,
                  phoneNumber: from,
                  direction: 'inbound',
                  messageType: 'text',
                  messageContent: body,
                  status: 'delivered',
                  deliveredAt: now,
                  sentAt: now,
                  waMessageId: inboundWaMessageId,
                  metadata: {
                    webhook: {
                      messageId: inboundWaMessageId,
                      timestamp: msg?.timestamp,
                      rawType: msg?.type,
                    },
                  },
                },
              },
              { upsert: true }
            );
          } else {
            await WhatsAppMessage.create({
              leadId: lead._id,
              phoneNumber: from,
              direction: 'inbound',
              messageType: 'text',
              messageContent: body,
              status: 'delivered',
              deliveredAt: now,
              sentAt: now,
              metadata: {
                webhook: {
                  messageId: msg?.id,
                  timestamp: msg?.timestamp,
                  rawType: msg?.type,
                },
              },
            });
          }

          // Run automations (welcome/greetings/chatbot/AI). Best-effort: failures are swallowed.
          handleInboundWhatsAppAutomations({
            leadId: lead._id,
            phoneNumber: from,
            messageBody: body,
            wasFirstInbound,
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler error';
    console.error('WhatsApp webhook processing failed:', message);

    await logWebhookEvent({
      kind: 'error',
      ok: false,
      message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
