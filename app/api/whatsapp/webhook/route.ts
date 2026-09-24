import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { ConsentManager } from '@/lib/consentManager';
import { ingestMetaSocialEvent, parseMetaSocialWebhookPayload } from '@/lib/socialInbox';

export const dynamic = 'force-dynamic';

import { handleInboundWhatsAppAutomations } from '@/lib/whatsappAutomation';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { assignLeadToNextAdmin } from '@/lib/crm/leadAssignment';

import { normalizePhone as normalizePhoneDigits, resubscribeWABAWebhooks } from '@/lib/whatsapp';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { getMetaCredentialsByPhoneNumberId } from '@/lib/whatsappAccounts';
import { upsertBunnyMetaMessage, updateBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';
import { getBunnyLeadByPhone, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { META_WHATSAPP_OWNER_IDS } from '@/lib/crm-handlers';

// Import media helpers
import { 
  getWhatsAppMediaUrl, 
  downloadWhatsAppMedia 
} from '@/lib/whatsapp';
import { uploadToS3, uploadToBunnyStorage } from '@/lib/bunny-storage';

// Safe verify of string
function safeString(s: any): string {
    return String(s || '').trim();
}

function normalizePhone(raw: string): string {
  try {
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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '')
    .trim()
    .replace(/['"]/g, '');
  
  await logWebhookEvent({
    kind: 'verify',
    ok: mode === 'subscribe' && token === expectedToken,
    message: `Verification Attempt: mode=${mode}, tokenMatched=${token === expectedToken}`,
    sample: { receivedToken: token, expectedToken, challenge }
  });

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
    console.log('[WEBHOOK GET] VERIFICATION SUCCESSFUL');
    resubscribeWABAWebhooks().catch((err) => {
      console.error('[WEBHOOK GET] Auto-resubscribe failed:', err);
    });

    return new Response(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const res = NextResponse.json(
    debug
      ? { error: 'Forbidden', mode, tokenMatched: token === expectedToken }
      : { error: 'Forbidden' },
    { status: 403 }
  );
  return res;
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n--- WEBHOOK POST RECEIVED [${timestamp}] ---`);
  
  try {
    const rawBody = await request.text();

    await logWebhookEvent({
      kind: 'unknown',
      ok: true,
      message: 'RAW_POST_RECEIVED',
      sample: { rawBodyLength: rawBody.length }
    });
    
    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();
    const rawSkipFlag = (process.env.SKIP_WEBHOOK_SIGNATURE || 'false').trim().toLowerCase().replace(/['"\\n]/g, '');
    let skipSignatureVerification = rawSkipFlag === 'true' || !appSecret;
    
    if (!skipSignatureVerification && appSecret) {
      const signatureHeader = request.headers.get('x-hub-signature-256') || request.headers.get('x-hub-signature') || '';
      if (!signatureHeader) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const equalsIndex = signatureHeader.indexOf('=');
      const algo = equalsIndex > 0 ? signatureHeader.slice(0, equalsIndex).toLowerCase() : 'sha256';
      const provided = equalsIndex > 0 ? signatureHeader.slice(equalsIndex + 1) : signatureHeader;
      const expected = crypto.createHmac(algo === 'sha1' ? 'sha1' : 'sha256', appSecret).update(rawBody, 'utf8').digest('hex');

      if (provided !== expected) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    if (payload?.object === 'page' || payload?.object === 'instagram') {
      const events = parseMetaSocialWebhookPayload(payload);
      for (const event of events) {
        await ingestMetaSocialEvent(event);
      }
      return NextResponse.json({ success: true, processed: events.length }, { status: 200 });
    }

    const res = await handleWebhookPayload(payload);
    return res;
  } catch (error) {
    logger.error('meta-webhook', 'CRITICAL Webhook Error', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Error' }, { status: 500 });
  }
}

async function logWebhookEvent(event: any) {
  try {
    // Replaced MongoDB insert with simple logging for webhook events
    console.log(`[WEBHOOK LOG] Event logged: ${event.kind} | Phone: ${event.phoneNumber || 'N/A'}`);
  } catch (err) {
    console.error('[WEBHOOK LOG ERROR] Failed to log event:', err);
  }
}

async function handleWebhookPayload(payload: any) {
  try {
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    if (entries.length === 0) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const now = new Date();

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const businessPhoneNumberId = value?.metadata?.phone_number_id;
        const tenantResolution = businessPhoneNumberId
          ? await getMetaCredentialsByPhoneNumberId(String(businessPhoneNumberId)).catch(() => null)
          : null;
        const tenantUserId = tenantResolution?.tenantUserId;
        const tenantCreds = tenantResolution?.creds;

        // 1) Status updates for messages we previously sent
        const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const st of statuses) {
          const waMessageId = String(st?.id || '').trim();
          if (!waMessageId) continue;

          const status = String(st?.status || '').toLowerCase();
          
          try {
            await updateBunnyMetaMessage(waMessageId, {
              status,
              updatedAt: now.toISOString(),
              ...(status === 'delivered' ? { deliveredAt: now.toISOString() } : {}),
              ...(status === 'read' ? { readAt: now.toISOString(), deliveredAt: now.toISOString() } : {}),
              ...(status === 'failed' ? { 
                errorMessage: Array.isArray(st?.errors) ? (st.errors[0]?.title || st.errors[0]?.message) : 'Failed'
              } : {})
            });
          } catch (bunnyErr) {
            console.error('[WEBHOOK] Failed to update BunnyDB status:', bunnyErr);
          }

          // TODO: Implement BroadcastRunMessage updates in BunnyDB once broadcast is migrated
        }

        // 2) Inbound messages (from user to us)
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const msg of messages) {
          try {
            const from = normalizePhone(String(msg?.from || ''));
            const type = String(msg?.type || 'text');
            const body = extractTextMessageBody(msg);
            const inboundWaMessageId = msg?.id ? String(msg.id).trim() : '';
            const msgTimestampSec = msg?.timestamp ? Number(msg.timestamp) : NaN;
            const msgSentAt = Number.isFinite(msgTimestampSec) ? new Date(msgTimestampSec * 1000) : now;

            if (!from || !body) continue;

            // --- Media Handling ---
            let s3MediaUrl: string | undefined = undefined;
            let mimeType: string | undefined = undefined;
            let mediaError: string | undefined = undefined;
            const isMediaType = ['image', 'video', 'audio', 'document', 'sticker'].includes(type);
            
            if (isMediaType) {
              const mediaData = msg[type];
              const mediaId = mediaData?.id;
              
              if (mediaId) {
                try {
                  const metaMediaUrl = await getWhatsAppMediaUrl(mediaId, tenantCreds);
                  if (metaMediaUrl) {
                    const { buffer, contentType } = await downloadWhatsAppMedia(metaMediaUrl, tenantCreds);
                    mimeType = contentType;
                    const extension = contentType.split('/')[1]?.split(';')[0] || 'bin';
                    const fileName = `whatsapp-inbound/${from}/${Date.now()}.${extension}`;

                    try {
                      s3MediaUrl = await uploadToBunnyStorage(buffer, fileName, { contentType });
                    } catch (bunnyErr) {
                      s3MediaUrl = await uploadToS3(buffer, fileName, {
                        metadata: { 'wa-message-id': inboundWaMessageId || '', 'phone-number': from }
                      });
                    }
                  }
                } catch (mediaErr: any) {
                  mediaError = mediaErr?.message || 'Unknown media error';
                }
              }
            }

            const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
            const profileName = contacts.find((c: any) => normalizePhone(String(c.wa_id)) === from)?.profile?.name || '';

            let lead = await getBunnyLeadByPhone(from, tenantUserId);
            let wasFirstInbound = false;

            if (!lead) {
              const { leadNumber } = await allocateNextLeadNumber();
              lead = {
                phoneNumber: from,
                name: profileName || 'WhatsApp User',
                source: 'whatsapp',
                labels: ['whatsapp'],
                status: 'lead',
                leadNumber,
                lastMessageAt: now.toISOString(),
                createdAt: now.toISOString(),
                ...(tenantUserId ? { createdByUserId: tenantUserId, assignedToUserId: tenantUserId } : {}),
              };
              lead = await saveBunnyLead(lead);
              wasFirstInbound = true;

              if (!tenantUserId) {
                try {
                  await assignLeadToNextAdmin(lead);
                } catch (assignErr) {
                  console.error('[WEBHOOK ERROR] Lead auto-assignment failed', assignErr);
                }
              }
              try {
                  await addLeadToMainBroadcastList(lead);
              } catch (blErr) {}
            } else {
              lead = await saveBunnyLead({
                ...lead,
                lastMessageAt: now.toISOString(),
                chatStatus: 'new',
                chatStatusClosedAt: null,
                chatStatusClosedBy: null,
                name: lead.name || profileName,
                labels: [...new Set([...(lead.labels || []), 'whatsapp'])]
              });
            }

            const ourDisplayPhone = value?.metadata?.display_phone_number
              ? String(value.metadata.display_phone_number)
              : '';
            const ourBusinessNumber = ourDisplayPhone ? normalizePhone(ourDisplayPhone) : undefined;
            
            const finalMessageType = isMediaType ? 'media' : 'text';
            
            const insertData: any = {
              leadId: String(lead._id),
              phoneNumber: from,
              direction: 'inbound',
              messageType: finalMessageType,
              messageContent: body,
              status: 'delivered',
              deliveredAt: now.toISOString(),
              sentAt: msgSentAt.toISOString(),
              waMessageId: inboundWaMessageId,
              senderNumber: ourBusinessNumber,
              provider: 'meta',
              isRead: false,
              createdAt: now.toISOString(),
            };

            if (isMediaType) {
              const mediaKind = type === 'image' ? 'image' : type === 'sticker' ? 'sticker' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'document';
              insertData.media = {
                kind: mediaKind,
                url: s3MediaUrl || null,
                mimeType: mimeType || null,
                error: mediaError || null,
              };
            }

            await upsertBunnyMetaMessage({
              _id: inboundWaMessageId || `${from}-${msgTimestampSec}-${body}`,
              ...insertData
            }).catch((bunnyError) => {
              console.error('[WEBHOOK] Bunny Meta message write failed:', bunnyError);
            });

            // Opt-out detection
            try {
              const { detectOptOutIntent } = await import('@/lib/qrOptOut');
              const normalizedBody = (body || '').toLowerCase().trim();
              const optIntent = detectOptOutIntent(body || '') || (normalizedBody === 'block' ? 'opt_out' : null);

              if (optIntent === 'opt_out') {
                await saveBunnyLead({
                  ...lead,
                  isBlocked: true,
                  status: 'blocked',
                  waBlockedReason: `User replied "${normalizedBody}"`,
                  waBlockedAt: now.toISOString()
                });
                const { sendWhatsAppText } = await import('@/lib/whatsapp');
                sendWhatsAppText(from, 'You have been unsubscribed. Reply START anytime to subscribe again. 🙏', tenantCreds).catch(()=>{});
                continue;
              }

              if (optIntent === 'opt_in' && lead.isBlocked) {
                await saveBunnyLead({
                  ...lead,
                  isBlocked: false,
                  waBlockedReason: null,
                  waBlockedAt: null
                });
                const { sendWhatsAppText } = await import('@/lib/whatsapp');
                sendWhatsAppText(from, 'Welcome back! You are subscribed again. 🙏', tenantCreds).catch(()=>{});
                continue;
              }
            } catch (optErr: any) {}

            if (lead.isBlocked) continue;

            handleInboundWhatsAppAutomations({
              leadId: lead._id,
              phoneNumber: from,
              messageBody: body,
              wasFirstInbound,
              tenantUserId,
              creds: tenantCreds,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// Deployment: Updated for BunnyDB
