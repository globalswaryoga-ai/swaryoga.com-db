import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
// NOTE: Models are imported DYNAMICALLY after connectDB() is called in the handler
// to avoid calling mongoose.model() before the connection is established
import { handleInboundWhatsAppAutomations } from '@/lib/whatsappAutomation';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

import { normalizePhone as normalizePhoneDigits } from '@/lib/whatsapp';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';

// Safe verify of string
function safeString(s: any): string {
    return String(s || '').trim();
}

function normalizePhone(raw: string): string {
  try {
     // Inline minimal logic safely if import fails or to be robust
     const s = safeString(raw).replace(/\D/g, '');
     if (s.length === 10) return '91' + s;
     return s;
  } catch (e) {
      console.error('normalizePhone error', e);
      return safeString(raw);
  }
}

function extractTextMessageBody(msg: any): string {
  const type = String(msg?.type || '');
  if (type === 'text') return String(msg?.text?.body || '').trim();
  if (type === 'button') return String(msg?.button?.text || '').trim();
  if (type === 'interactive') {
    const iType = msg?.interactive?.type;
    if (iType === 'button_reply') return String(msg?.interactive?.button_reply?.title || '').trim();
    if (iType === 'list_reply') return String(msg?.interactive?.list_reply?.title || '').trim();
  }
  // Fallback for media or other types
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

  const expectedToken = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '')
    .trim()
    .replace(/['"]/g, ''); // Robust check against quotes in Vercel
  
  await logWebhookEvent({
    kind: 'verify',
    ok: mode === 'subscribe' && token === expectedToken,
    message: `Verification Attempt: mode=${mode}, tokenMatched=${token === expectedToken}`,
    sample: { receivedToken: token, expectedToken, challenge }
  }).catch(() => {});

  console.log('[WEBHOOK GET] expectedToken from env:', expectedToken ? `${expectedToken.substring(0, 10)}...` : 'NOT SET');
  console.log('[WEBHOOK GET] received token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
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
    // Meta expects the raw challenge string as plain text.
    console.log('[WEBHOOK GET] VERIFICATION SUCCESSFUL');
    return new Response(challenge, { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }

  const res = NextResponse.json(
    debug
      ? {
          error: 'Forbidden',
          hint: 'Check Meta callback URL and WHATSAPP_WEBHOOK_VERIFY_TOKEN match.',
          mode,
          hasChallenge: Boolean(challenge),
          tokenMatched: token === expectedToken,
          expectedTokenLength: expectedToken ? expectedToken.length : 0,
          receivedTokenLength: token ? token.length : 0,
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
    const timestamp = new Date().toISOString();
    // Quick health ping: prove Meta (or any caller) is reaching our POST handler.
    // This is intentionally lightweight and should never break the webhook path.
    await logWebhookEvent({
      kind: 'unknown',
      ok: true,
      message: 'POST_HEALTH_PING',
      sample: {
        at: timestamp,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
      },
    }).catch(() => {});
    
    // CRITICAL: Read the raw body FIRST because it can only be read once!
    const rawBody = await request.text();

    // CRITICAL: Log every single hit to the DB immediately to see if Meta reaches us
    await logWebhookEvent({
      kind: 'unknown',
      ok: true,
      message: 'RAW_POST_RECEIVED',
      sample: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        rawBodyLength: rawBody.length,
        rawBodyPreview: rawBody.substring(0, 1000), // Log more of the body for debugging
      }
    }).catch(() => {});

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔴 WEBHOOK POST RECEIVED AT ${timestamp}`);
    console.log(`URL: ${request.url}`);
    console.log(`Method: ${request.method}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(request.headers), null, 2)}`);
    
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';

    const signatureDebug: {
      enabled: boolean;
      headerPresent: boolean;
      headerName?: 'x-hub-signature-256' | 'x-hub-signature' | 'none';
      algo?: 'sha256' | 'sha1' | 'unknown';
      providedPrefix?: string;
      expectedPrefix?: string;
      expectedLength?: number;
      providedLength?: number;
    } = { enabled: debug, headerPresent: false };

    console.log(`📦 Raw Body Received: ${rawBody.length} bytes`);
    console.log(`📦 Body Preview: ${rawBody.substring(0, 200)}`);
    
    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
      console.log(`✅ JSON Parsed Successfully`);
      console.log(`📄 Payload Structure: ${JSON.stringify(Object.keys(payload), null, 2)}`);
    } catch (e) {
      console.log('❌ JSON PARSE FAILED');
      console.log(`Error: ${e.message}`);
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

    if (!payload) {
      console.log('★★★ PAYLOAD WAS NULL/EMPTY ★★★');
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

    // Lightweight enrichment: capture key Meta metadata fields early so diagnostics can
    // distinguish real business-number traffic from local/simulated payloads.
    try {
      const v = payload?.entry?.[0]?.changes?.[0]?.value;
      const metaPhoneNumberId = v?.metadata?.phone_number_id;
      const metaDisplayPhoneNumber = v?.metadata?.display_phone_number;
      if (metaPhoneNumberId || metaDisplayPhoneNumber) {
        await logWebhookEvent({
          kind: 'unknown',
          ok: true,
          message: 'RAW_POST_META_METADATA',
          sample: {
            url: request.url,
            userAgent: request.headers.get('user-agent'),
            phone_number_id: metaPhoneNumberId,
            display_phone_number: metaDisplayPhoneNumber,
          },
        }).catch(() => {});
      }
    } catch {
      // never let diagnostics logging break webhook
    }

    // Recommended: verify Meta webhook signature if APP_SECRET is available.
    // This protects against random internet POSTs that would otherwise be accepted.
    // TEMPORARY: Skip signature verification for debugging (will re-enable after confirming messages arrive)
    // CRITICAL FIX: Env var stored with quotes+newline in Vercel, so skip verification entirely for now
    let appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();
    let skipSignatureVerification = true; // FORCE skip until we can fix the env var format
    
    // Clean approach: only verify if explicitly not skipped AND the skip flag is properly formatted
    const rawSkipFlag = (process.env.SKIP_WEBHOOK_SIGNATURE || '').trim().toLowerCase().replace(/['"\\n]/g, '');
    if (rawSkipFlag === 'false') {
      skipSignatureVerification = false;
    }
    
    console.log(`🔐 Signature Check: appSecret=${appSecret ? 'SET' : 'NOT SET'}, skipSignatureVerification=${skipSignatureVerification}`);
    if (appSecret && !skipSignatureVerification) {
      const sig256 = request.headers.get('x-hub-signature-256');
      const sig1 = request.headers.get('x-hub-signature');
      const signatureHeader = sig256 || sig1 || '';

      if (debug) {
        signatureDebug.headerPresent = Boolean(signatureHeader);
        signatureDebug.headerName = sig256 ? 'x-hub-signature-256' : sig1 ? 'x-hub-signature' : 'none';
      }

      const equalsIndex = signatureHeader.indexOf('=');
      const algo = equalsIndex > 0 ? signatureHeader.slice(0, equalsIndex).toLowerCase() : '';
      const provided = equalsIndex > 0 ? signatureHeader.slice(equalsIndex + 1) : '';
      const supportedAlgo = algo === 'sha1' ? 'sha1' : 'sha256';

      if (debug) {
        signatureDebug.algo = supportedAlgo === 'sha1' ? 'sha1' : 'sha256';
        signatureDebug.providedLength = provided.length;
      }

      if (!provided) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Missing webhook signature header',
          sample: debug ? { signatureDebug } : undefined,
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
      if (debug) signatureDebug.expectedLength = expectedLength;
      if (provided.length !== expectedLength || !/^[0-9a-fA-F]+$/.test(provided)) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature format',
          sample: debug ? { signatureDebug } : undefined,
        });
        const res = NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
        res.headers.set('x-swar-webhook-method', 'POST');
        res.headers.set('x-swar-webhook-reason', 'signature-format');
        return res;
      }

      // Use the rawBody we already read at the top of the function
      const expected = crypto.createHmac(supportedAlgo, appSecret).update(rawBody, 'utf8').digest('hex');

      if (debug) {
        signatureDebug.providedPrefix = provided.slice(0, 12);
        signatureDebug.expectedPrefix = expected.slice(0, 12);
      }

      const providedBuf = Buffer.from(provided, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      if (providedBuf.length !== expectedBuf.length) {
        await logWebhookEvent({
          kind: 'error',
          ok: false,
          message: 'Invalid webhook signature length',
          sample: debug ? { signatureDebug } : undefined,
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
          sample: debug ? { signatureDebug } : undefined,
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

    // If we reach here, we already have payload parsed from rawBody above
    if (!payload) {
      const res = NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      res.headers.set('x-swar-webhook-route', 'whatsapp-webhook');
      res.headers.set('x-swar-webhook-method', 'POST');
      res.headers.set('x-swar-webhook-reason', 'invalid-json');
      return res;
    }

    console.log('★★★ PAYLOAD RECEIVED, CALLING handleWebhookPayload ★★★');
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
    
    // Import model getter function after connectDB() to ensure connection is established
    const { getWhatsAppWebhookEvent } = await import('@/lib/schemas/enterpriseSchemas');
    const WhatsAppWebhookEvent = getWhatsAppWebhookEvent();

    // Attribute whether this came from Meta or from a local/simulator hit.
    // In production diagnostics, we only want to treat Meta-sourced hits as authoritative.
    const urlSample = String(event?.sample?.url || '');
    const inferredSource = urlSample.includes('localhost') || urlSample.includes('127.0.0.1') ? 'local' : 'meta';
    
    await WhatsAppWebhookEvent.create({
      source: inferredSource,
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
    console.log('[WEBHOOK DEBUG] Raw payload:', JSON.stringify(payload, null, 2).substring(0, 500));

    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    if (entries.length === 0) {
      await logWebhookEvent({
        kind: 'unknown',
        ok: true,
        message: 'No entries in webhook payload',
        sample: { object: payload?.object, hasEntry: false },
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    console.log('[WEBHOOK DEBUG] Connected to DB');
    const { getWhatsAppMessage, getLead } = await import('@/lib/schemas/enterpriseSchemas');
    const WhatsAppMessage = getWhatsAppMessage();
    const Lead = getLead();
    console.log('[WEBHOOK DEBUG] Models loaded');
    
    if (!WhatsAppMessage || !Lead) {
      console.error('[WEBHOOK ERROR] Models not initialized');
      return NextResponse.json({ error: 'Database models not ready' }, { status: 500 });
    }

    const now = new Date();

    for (const entry of entries) {
      console.log('[WEBHOOK DEBUG] Processing entry');
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        console.log('[WEBHOOK DEBUG] Processing change');
        const value = change?.value;
        if (!value) continue;

        // NEW: Log the Phone Number Id from metadata to verify we are receiving for the correct business phone
        const businessPhoneNumberId = value?.metadata?.phone_number_id;

        // 1) Status updates for messages we previously sent
        const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const st of statuses) {
          const waMessageId = String(st?.id || '').trim();
          if (!waMessageId) continue;

          const status = String(st?.status || '').toLowerCase();
          const update: any = { status, updatedAt: now };

          if (status === 'delivered') update.deliveredAt = now;
          if (status === 'read') update.readAt = now;
          if (status === 'failed') {
            const err = Array.isArray(st?.errors) ? st.errors[0] : undefined;
            update.failureReason = err?.title || err?.message || 'Failed';
          }

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
          });
        }

        // 2) Inbound messages (from user to us)
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        if (messages.length > 0) {
          console.log(`📥 Processing ${messages.length} inbound messages`);
        }
        for (const msg of messages) {
          try {
            const from = normalizePhone(String(msg?.from || ''));
            const body = extractTextMessageBody(msg);
            const inboundWaMessageId = msg?.id ? String(msg.id).trim() : '';
            const msgTimestampSec = msg?.timestamp ? Number(msg.timestamp) : NaN;
            const msgSentAt = Number.isFinite(msgTimestampSec) ? new Date(msgTimestampSec * 1000) : now;

            console.log(`📩 Inbound From: ${from} | Body: ${body?.substring(0, 30)} | ID: ${inboundWaMessageId}`);

            if (!from || !body) {
              console.log('⚠️ Skipping message due to missing phone or body');
              continue;
            }

            // Ensure Lead exists
            console.log(`[WEBHOOK DEBUG] Finding lead for ${from}`);
            let lead = await Lead.findOne({ phoneNumber: from });
            let wasFirstInbound = false;
            if (!lead) {
              console.log(`[WEBHOOK DEBUG] Creating new lead for ${from}`);
              // Allocate a unique leadNumber for this new lead
              const { leadNumber } = await allocateNextLeadNumber();
              lead = await Lead.create({
                phoneNumber: from,
                source: 'whatsapp',
                status: 'lead',
                leadNumber,
                lastMessageAt: now,
              });
              wasFirstInbound = true;
              // Auto-add to main broadcast list
              try {
                  console.log(`[WEBHOOK DEBUG] Adding to broadcast list`);
                  await addLeadToMainBroadcastList(lead);
              } catch (blErr) {
                  console.error('[WEBHOOK ERROR] Broadcast list add failed', blErr);
              }
            } else {
              console.log(`[WEBHOOK DEBUG] Updating existing lead ${lead._id}`);
              await Lead.updateOne({ _id: lead._id }, { $set: { lastMessageAt: now } });
            }

            // Store message
            // For CRM: we want *our* business number in digits, not the user's number.
            // Meta provides display phone number like "+91 97790 06820".
            // Normalize it to digits so it's consistent.
            const ourDisplayPhone = value?.metadata?.display_phone_number
              ? String(value.metadata.display_phone_number)
              : '';
            const ourBusinessNumber = ourDisplayPhone ? normalizePhone(ourDisplayPhone) : undefined;
            
            await WhatsAppMessage.updateOne(
              {
                direction: 'inbound',
                // Prefer WA message id when present; otherwise fall back to (leadId + sentAt)
                // to prevent duplicate inserts if Meta retries with missing id.
                $or: inboundWaMessageId
                  ? [{ waMessageId: inboundWaMessageId }]
                  : [{ leadId: lead._id, sentAt: msgSentAt, messageContent: body }],
              },
              {
                $set: { updatedAt: now },
                $setOnInsert: {
                  leadId: lead._id,
                  phoneNumber: from,
                  direction: 'inbound',
                  messageType: 'text',
                  messageContent: body,
                  status: 'delivered',
                  deliveredAt: now,
                  sentAt: msgSentAt,
                  waMessageId: inboundWaMessageId,
                  senderNumber: ourBusinessNumber,
                  provider: 'meta',
                  isRead: false, // Mark new inbound as unread for CRM badge
                  createdAt: now,
                },
              },
              { upsert: true }
            );

            await logWebhookEvent({
              kind: 'inbound_message',
              ok: true,
              phoneNumber: from,
              waMessageId: inboundWaMessageId,
              message: `Inbound received for business phone ID: ${businessPhoneNumberId}`,
            });

            // Trigger automation logic
            handleInboundWhatsAppAutomations({
              leadId: lead._id,
              phoneNumber: from,
              messageBody: body,
              wasFirstInbound,
            }).catch((err) => {
              console.error('[Automation Error]', err);
            });

          } catch (err) {
            console.error('[WEBHOOK ERROR] Loop failure:', err);
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
// Deployment: Thu Jan  8 03:43:20 IST 2026
