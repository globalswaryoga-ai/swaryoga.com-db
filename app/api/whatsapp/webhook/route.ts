import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
// NOTE: Models are imported DYNAMICALLY after connectDB() is called in the handler
// to avoid calling mongoose.model() before the connection is established
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
  const debug = url.searchParams.get('debug') === '1';
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken) {
    const res = NextResponse.json(
      { error: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set' },
      { status: 500 }
    );
    res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
    res.headers.set('x-swar-webhook-method', 'GET');
    res.headers.set('x-swar-webhook-reason', 'verify-token-missing');
    return res;
  }

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    // Meta expects the raw challenge string.
    const res = new NextResponse(challenge, { status: 200 });
    res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
    res.headers.set('x-swar-webhook-method', 'GET');
    res.headers.set('x-swar-webhook-ok', '1');
    return res;
  }

  const res = NextResponse.json(
    debug
      ? {
          error: 'Forbidden',
          hint: 'Check Meta callback URL and WHATSAPP_WEBHOOK_VERIFY_TOKEN match.',
          mode,
          hasChallenge: Boolean(challenge),
          tokenMatched: token === expectedToken,
        }
      : { error: 'Forbidden' },
    { status: 403 }
  );
  res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
  res.headers.set('x-swar-webhook-method', 'GET');
  res.headers.set('x-swar-webhook-reason', 'verify-forbidden');
  return res;
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';

    // Recommended: verify Meta webhook signature if APP_SECRET is available.
    // This protects against random internet POSTs that would otherwise be accepted.
    // TEMPORARY: Skip signature verification for debugging (will re-enable after confirming messages arrive)
    const appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();
    const skipSignatureVerification = process.env.SKIP_WEBHOOK_SIGNATURE === 'true'; // Debug flag
    if (appSecret && !skipSignatureVerification) {
      const signatureHeader =
        request.headers.get('x-hub-signature-256') || request.headers.get('x-hub-signature') || '';
      const equalsIndex = signatureHeader.indexOf('=');
      const algo = equalsIndex > 0 ? signatureHeader.slice(0, equalsIndex).toLowerCase() : '';
      const provided = equalsIndex > 0 ? signatureHeader.slice(equalsIndex + 1) : '';
      const supportedAlgo = algo === 'sha1' ? 'sha1' : 'sha256';

      if (!provided) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Missing webhook signature header',
        });
        const res = NextResponse.json(
          debug
            ? {
                error: 'Missing x-hub-signature',
                hint: 'If META_APP_SECRET/WHATSAPP_APP_SECRET is set, Meta must send a webhook signature header (x-hub-signature or x-hub-signature-256).',
              }
            : { error: 'Missing webhook signature' },
          { status: 401 }
        );
        res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
        res.headers.set('x-swar-webhook-method', 'POST');
        res.headers.set('x-swar-webhook-reason', 'signature-missing');
        return res;
      }

      const expectedLength = supportedAlgo === 'sha256' ? 64 : 40;
      if (provided.length !== expectedLength || !/^[0-9a-fA-F]+$/.test(provided)) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature format',
        });
        const res = NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
        res.headers.set('x-swar-webhook-method', 'POST');
        res.headers.set('x-swar-webhook-reason', 'signature-format');
        return res;
      }

      const rawBody = await request.text();
      const expected = crypto.createHmac(supportedAlgo, appSecret).update(rawBody, 'utf8').digest('hex');
      const providedBuf = Buffer.from(provided, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      if (providedBuf.length !== expectedBuf.length) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature length',
        });
        const res = NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
        res.headers.set('x-swar-webhook-method', 'POST');
        res.headers.set('x-swar-webhook-reason', 'signature-length');
        return res;
      }
      const ok = crypto.timingSafeEqual(providedBuf, expectedBuf);
      if (!ok) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature (HMAC mismatch)',
        });
        const res = NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
        res.headers.set('x-swar-webhook-method', 'POST');
        res.headers.set('x-swar-webhook-reason', 'signature-mismatch');
        return res;
      }

      // Re-parse the JSON from the already-read raw body.
      const payload = JSON.parse(rawBody);
      // Continue below using this payload.
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const res = await handleWebhookPayload(payload);
      res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
      res.headers.set('x-swar-webhook-method', 'POST');
      res.headers.set('x-swar-webhook-ok', '1');
      res.headers.set('x-swar-webhook-signature', 'verified');
      return res;
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      await logWebhookEvent({
        kind: 'error',
        ok: false,
        message: 'Invalid JSON body',
      });
      const res = NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
      res.headers.set('x-swar-webhook-method', 'POST');
      res.headers.set('x-swar-webhook-reason', 'invalid-json');
      return res;
    }

    const res = await handleWebhookPayload(payload);
    res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
    res.headers.set('x-swar-webhook-method', 'POST');
    res.headers.set('x-swar-webhook-ok', '1');
    res.headers.set('x-swar-webhook-signature', appSecret ? 'expected' : 'not-configured');
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler error';

    // Avoid throwing here; webhook responses must be fast and resilient.
    console.error('WhatsApp webhook processing failed:', message);

    await logWebhookEvent({
      kind: 'error',
      ok: false,
      message,
    });

    const res = NextResponse.json({ error: message }, { status: 500 });
    res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
    res.headers.set('x-swar-webhook-method', 'POST');
    res.headers.set('x-swar-webhook-reason', 'unhandled');
    return res;
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
    
    // Import models after connectDB() to ensure connection is established
    const { WhatsAppWebhookEvent } = await import('@/lib/schemas/enterpriseSchemas');
    
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
    console.log(`[WEBHOOK LOG] Event logged: ${event.kind} | Phone: ${event.phoneNumber}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[WEBHOOK LOG ERROR] Failed to log event:', errMsg, event);
  }
}

async function handleWebhookPayload(payload: any) {
  try {
    // DEBUG: Log raw payload for troubleshooting
    console.log('[WEBHOOK DEBUG] Payload received:', JSON.stringify(payload, null, 2).substring(0, 500));

    // Meta sends events with object: 'whatsapp_business_account'.
    // We accept others too, but ignore unknown shapes safely.
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    console.log('[WEBHOOK DEBUG] Entries count:', entries.length);
    
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
    
    // Import models after connectDB() to ensure connection is established
    const { Lead, WhatsAppMessage } = await import('@/lib/schemas/enterpriseSchemas');

    console.log('[WEBHOOK] Processing webhook - entries:', entries.length);

    const now = new Date();

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      console.log('[WEBHOOK] Entry has', changes.length, 'changes');
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
    console.log('[WEBHOOK] Messages in this change:', messages.length);
    
    for (const msg of messages) {
      try {
        console.log('[WEBHOOK] Message:', JSON.stringify(msg).substring(0, 200));
        
        const from = normalizePhone(String(msg?.from || ''));
        console.log('[WEBHOOK] Normalized from:', from);
        
        if (!from) {
          console.log('[WEBHOOK] Skipping: no phone');
          continue;
        }

        const body = extractTextMessageBody(msg);
        console.log('[WEBHOOK] Body extracted:', body?.substring(0, 50));
        
        if (!body) {
          console.log('[WEBHOOK] Skipping: no body');
          continue;
        }

        const inboundWaMessageId = msg?.id ? String(msg.id).trim() : '';
        console.log('[WEBHOOK] Message ID:', inboundWaMessageId);

        await logWebhookEvent({
          kind: 'inbound_message',
          ok: true,
          phoneNumber: from,
          waMessageId: msg?.id ? String(msg.id) : undefined,
          sample: {
            type: msg?.type,
            ts: msg?.timestamp,
            preview: body.slice(0, 80),
          },
        });

        // Ensure a Lead exists
        console.log('[WEBHOOK] Looking up lead for:', from);
        let lead: { _id: unknown } | null = (await Lead.findOne({ phoneNumber: from }).lean()) as { _id: unknown } | null;
        if (!lead) {
          console.log('[WEBHOOK] Creating new lead for:', from);
          const created = await Lead.create({
            phoneNumber: from,
            source: 'whatsapp',
            status: 'lead',
            lastMessageAt: now,
          });
          lead = created.toObject() as { _id: unknown };
          console.log('[WEBHOOK] Created lead:', lead._id);
        } else {
          console.log('[WEBHOOK] Found existing lead:', lead._id);
          await Lead.updateOne({ _id: lead._id }, { $set: { lastMessageAt: now, updatedAt: now } });
        }

        if (!lead?._id) {
          console.log('[WEBHOOK] No lead ID, skipping');
          continue;
        }            // Detect if this is the first inbound message for welcome automation.
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
              console.log('[WEBHOOK] Upserting message:', inboundWaMessageId);
              try {
                const result = await WhatsAppMessage.updateOne(
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
                      isRead: false, // Mark as unread for notification badge
                      // Styling: incoming messages appear in green background with white text
                      backgroundColor: '#22c55e', // Bright green
                      textColor: '#ffffff', // White text
                      borderRadius: '8px',
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
                console.log('[WEBHOOK] Message upserted SUCCESS - matched:', result?.matchedCount, 'upserted:', result?.upsertedCount);
              } catch (upsertErr) {
                const errMsg = upsertErr instanceof Error ? upsertErr.message : String(upsertErr);
                console.error('[WEBHOOK ERROR] Upsert failed:', errMsg);
                throw upsertErr;
              }
            } else {
              console.log('[WEBHOOK] Creating message (no ID)');
              try {
                await WhatsAppMessage.create({
                  leadId: lead._id,
                  phoneNumber: from,
                  direction: 'inbound',
                  messageType: 'text',
                  messageContent: body,
                  status: 'delivered',
                  deliveredAt: now,
                  sentAt: now,
                  isRead: false, // Mark as unread for notification badge
                  // Styling: incoming messages appear in green background with white text
                  backgroundColor: '#22c55e', // Bright green
                  textColor: '#ffffff', // White text
                  borderRadius: '8px',
                  metadata: {
                    webhook: {
                      messageId: msg?.id,
                      timestamp: msg?.timestamp,
                      rawType: msg?.type,
                    },
                  },
                });
                console.log('[WEBHOOK] Message created SUCCESS');
              } catch (createErr) {
                const errMsg = createErr instanceof Error ? createErr.message : String(createErr);
                console.error('[WEBHOOK ERROR] Create failed:', errMsg);
                throw createErr;
              }
            }

            // Run automations (welcome/greetings/chatbot/AI). Best-effort: failures are swallowed.
            handleInboundWhatsAppAutomations({
              leadId: lead._id,
              phoneNumber: from,
              messageBody: body,
              wasFirstInbound,
            }).catch(() => {});
          } catch (msgError) {
            const errMsg = msgError instanceof Error ? msgError.message : 'Unknown error';
            console.error('[WEBHOOK ERROR] Failed to process message:', errMsg);
            await logWebhookEvent({
              kind: 'error',
              ok: false,
              message: 'Message processing error: ' + errMsg,
            });
          }
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
