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

// Import media helpers
import { 
  getWhatsAppMediaUrl, 
  downloadWhatsAppMedia 
} from '@/lib/whatsapp';
import { uploadToS3 } from '@/lib/aws-s3';

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
  
  // Handle media types
  if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
    const media = msg[type];
    const caption = media?.caption ? ` - ${media.caption}` : '';
    return `[${type} message]${caption}`;
  }

  // Fallback for location or other types
  if (type === 'location') {
      return `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
  }

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
  const timestamp = new Date().toISOString();
  console.log(`\n--- WEBHOOK POST RECEIVED [${timestamp}] ---`);
  
  try {
    // Quick health ping: prove Meta (or any caller) is reaching our POST handler.
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
    }).catch(err => console.error('Early log failure:', err));
    
    // CRITICAL: Read the raw body FIRST because it can only be read once!
    const rawBody = await request.text();
    console.log(`Body Length: ${rawBody.length} | Preview: ${rawBody.substring(0, 100)}`);

    // Log the raw hit
    await logWebhookEvent({
      kind: 'unknown',
      ok: true,
      message: 'RAW_POST_RECEIVED',
      sample: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        rawBodyLength: rawBody.length,
        rawBodyPreview: rawBody.substring(0, 2000), 
      }
    }).catch(() => {});
    
    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Recommended: verify Meta webhook signature if APP_SECRET is available.
    // Clean approach: only verify if explicitly not skipped
    const appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();
    const rawSkipFlag = (process.env.SKIP_WEBHOOK_SIGNATURE || 'true').trim().toLowerCase().replace(/['"\\n]/g, '');
    let skipSignatureVerification = rawSkipFlag === 'true' || !appSecret;
    
    console.log(`🔐 Signature Check: appSecret=${appSecret ? 'SET' : 'NOT SET'}, skipSignatureVerification=${skipSignatureVerification}`);
    
    if (!skipSignatureVerification && appSecret) {
      const signatureHeader = request.headers.get('x-hub-signature-256') || request.headers.get('x-hub-signature') || '';
      if (!signatureHeader) {
        console.warn('Missing signature header, but verification required.');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const equalsIndex = signatureHeader.indexOf('=');
      const algo = equalsIndex > 0 ? signatureHeader.slice(0, equalsIndex).toLowerCase() : 'sha256';
      const provided = equalsIndex > 0 ? signatureHeader.slice(equalsIndex + 1) : signatureHeader;
      const expected = crypto.createHmac(algo === 'sha1' ? 'sha1' : 'sha256', appSecret).update(rawBody, 'utf8').digest('hex');

      if (provided !== expected) {
        console.error('Signature Mismatch!');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('✅ Signature Verified');
    }

    // Process the payload
    const res = await handleWebhookPayload(payload);
    return res;
  } catch (error) {
    console.error('CRITICAL Webhook Error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Error' }, { status: 500 });
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
    // Ensure DB connection is active for model use
    await connectDB();
    
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
            const type = String(msg?.type || 'text');
            const body = extractTextMessageBody(msg);
            const inboundWaMessageId = msg?.id ? String(msg.id).trim() : '';
            const msgTimestampSec = msg?.timestamp ? Number(msg.timestamp) : NaN;
            const msgSentAt = Number.isFinite(msgTimestampSec) ? new Date(msgTimestampSec * 1000) : now;

            console.log(`📩 Inbound From: ${from} | Type: ${type} | Body: ${body?.substring(0, 30)}`);

            if (!from || !body) {
              console.log('⚠️ Skipping message due to missing phone or body');
              continue;
            }

            // --- Media Handling ---
            let s3MediaUrl: string | undefined = undefined;
            let mimeType: string | undefined = undefined;
            
            if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
              const mediaData = msg[type];
              const mediaId = mediaData?.id;
              
              if (mediaId) {
                try {
                  console.log(`[WEBHOOK MEDIA] Fetching media ID: ${mediaId} for type: ${type}`);
                  const metaMediaUrl = await getWhatsAppMediaUrl(mediaId);
                  console.log(`[WEBHOOK MEDIA] Got Meta URL: ${metaMediaUrl?.substring(0, 80)}...`);
                  
                  const { buffer, contentType } = await downloadWhatsAppMedia(metaMediaUrl);
                  console.log(`[WEBHOOK MEDIA] Downloaded ${buffer.length} bytes, type: ${contentType}`);
                  
                  mimeType = contentType;
                  const extension = contentType.split('/')[1]?.split(';')[0] || 'bin';
                  const fileName = `whatsapp/${from}/${Date.now()}.${extension}`;
                  
                  s3MediaUrl = await uploadToS3(buffer, fileName, {
                    metadata: {
                      'wa-message-id': inboundWaMessageId,
                      'phone-number': from
                    }
                  });
                  console.log(`[WEBHOOK MEDIA] ✅ Uploaded to S3: ${s3MediaUrl}`);
                } catch (mediaErr: any) {
                  console.error('[WEBHOOK MEDIA ERROR] Failed to process media:', mediaErr?.message || mediaErr);
                  console.error('[WEBHOOK MEDIA ERROR] Stack:', mediaErr?.stack);
                }
              } else {
                console.warn(`[WEBHOOK MEDIA] No media ID found for ${type} message`);
              }
            }

            // Extract Profile Name from contacts if available
            const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
            const profileName = contacts.find((c: any) => normalizePhone(String(c.wa_id)) === from)?.profile?.name || '';

            // Ensure Lead exists
            console.log(`[WEBHOOK DEBUG] Finding lead for ${from}`);
            let lead = await Lead.findOne({ phoneNumber: from });
            let wasFirstInbound = false;

            if (!lead) {
              console.log(`[WEBHOOK DEBUG] Creating new lead for ${from} with name ${profileName}`);
              // Allocate a unique leadNumber for this new lead
              const { leadNumber } = await allocateNextLeadNumber();
              lead = await Lead.create({
                phoneNumber: from,
                name: profileName || 'WhatsApp User', // Capture Meta Profile Name
                source: 'whatsapp',
                labels: ['whatsapp'],
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
              const updatePayload: any = { 
                lastMessageAt: now,
                $addToSet: { labels: 'whatsapp' }
              };
              // Fill name if missing but Meta provided one
              if (!lead.name && profileName) {
                updatePayload.name = profileName;
              }
              
              await Lead.updateOne({ _id: lead._id }, updatePayload);
            }

            // Store message
            // For CRM: we want *our* business number in digits, not the user's number.
            // Meta provides display phone number like "+91 97790 06820".
            // Normalize it to digits so it's consistent.
            const ourDisplayPhone = value?.metadata?.display_phone_number
              ? String(value.metadata.display_phone_number)
              : '';
            const ourBusinessNumber = ourDisplayPhone ? normalizePhone(ourDisplayPhone) : undefined;
            
            const insertData: any = {
              leadId: lead._id,
              phoneNumber: from,
              direction: 'inbound',
              messageType: s3MediaUrl ? 'media' : 'text',
              messageContent: body,
              status: 'delivered',
              deliveredAt: now,
              sentAt: msgSentAt,
              waMessageId: inboundWaMessageId,
              senderNumber: ourBusinessNumber,
              provider: 'meta',
              isRead: false, // Mark new inbound as unread for CRM badge
              createdAt: now,
            };

            if (s3MediaUrl) {
              // Normalize kind for UI convenience
              const mediaKind = (type === 'image' || type === 'sticker' || type === 'audio') 
                ? 'image' 
                : type === 'video' 
                  ? 'video' 
                  : 'document';
                  
              insertData.media = {
                kind: mediaKind,
                url: s3MediaUrl,
                mimeType: mimeType,
              };
            }

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
                $setOnInsert: insertData,
              },
              { upsert: true }
            );

            await logWebhookEvent({
              kind: 'inbound_message',
              ok: true,
              phoneNumber: from,
              waMessageId: inboundWaMessageId,
              message: `Inbound from ${from} (${type}) for BID: ${businessPhoneNumberId || 'unknown'}: ${body?.substring(0, 50)}`,
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
