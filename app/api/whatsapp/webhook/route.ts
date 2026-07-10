import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ConsentManager } from '@/lib/consentManager';

export const dynamic = 'force-dynamic';

// NOTE: Models are imported DYNAMICALLY after connectDB() is called in the handler
// to avoid calling mongoose.model() before the connection is established
import { handleInboundWhatsAppAutomations } from '@/lib/whatsappAutomation';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { assignLeadToNextAdmin } from '@/lib/crm/leadAssignment';

import { normalizePhone as normalizePhoneDigits, resubscribeWABAWebhooks } from '@/lib/whatsapp';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { getMetaCredentialsByPhoneNumberId } from '@/lib/whatsappAccounts';

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

    // Auto re-subscribe WABA webhooks to prevent delivery pauses after deployments.
    // Fire-and-forget — don't block the verification response.
    resubscribeWABAWebhooks().catch((err) => {
      console.error('[WEBHOOK GET] Auto-resubscribe failed:', err);
    });

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
        logger.warn('meta-webhook', 'Signature mismatch — rejecting request');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      logger.debug('meta-webhook', 'Signature verified');
    }

    // Process the payload
    const res = await handleWebhookPayload(payload);
    return res;
  } catch (error) {
    logger.error('meta-webhook', 'CRITICAL Webhook Error', error);
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
    const { getWhatsAppMessage, getLead, getBroadcastRunMessage, getBroadcastRun, getFunnelStageHistory } = await import('@/lib/schemas/enterpriseSchemas');
    const WhatsAppMessage = getWhatsAppMessage();
    const Lead = getLead();
    const BroadcastRunMessage = getBroadcastRunMessage();
    const BroadcastRun = getBroadcastRun();
    const FunnelStageHistory = getFunnelStageHistory();
    console.log('[WEBHOOK DEBUG] Models loaded');
    
    if (!WhatsAppMessage || !Lead) {
      logger.error('meta-webhook', 'Models not initialized after connectDB');
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

        // Resolve which tenant (if any) owns this Meta phone number. Returns null
        // for the legacy/default shared number — in that case everything below
        // behaves exactly as before (no tenant filter, global env credentials).
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
          const update: any = { status, updatedAt: now };

          if (status === 'delivered') update.deliveredAt = now;
          if (status === 'read') update.readAt = now;
          if (status === 'failed') {
            const err = Array.isArray(st?.errors) ? st.errors[0] : undefined;
            update.failureReason = err?.title || err?.message || 'Failed';
            update.failureCode = err?.code?.toString() || undefined;
          }

          // REAL BILLING CAPTURE: Meta attaches the actual conversation +
          // pricing info to 'sent' statuses. Store it so cost reports can use
          // Meta's real billing category instead of guessing from price tables.
          if (st?.pricing || st?.conversation) {
            update['metadata.metaBilling'] = {
              conversationId: st?.conversation?.id || undefined,
              originType: st?.conversation?.origin?.type || undefined,
              category: st?.pricing?.category || st?.conversation?.origin?.type || undefined,
              billable: st?.pricing?.billable !== false,
              pricingModel: st?.pricing?.pricing_model || undefined,
              expiresAt: st?.conversation?.expiration_timestamp
                ? new Date(Number(st.conversation.expiration_timestamp) * 1000)
                : undefined,
            };
          }

          // Update WhatsAppMessage (single message tracking)
          await WhatsAppMessage.updateOne(
            { $or: [{ waMessageId }, { externalMessageId: waMessageId }] },
            { $set: update }
          );

          // Blocked / failed lead tracking — 3-strike system
          const errorCode = st?.errors?.[0]?.code;
          const isBlockedError =
            errorCode === 131026 || errorCode === 131047 ||
            errorCode === '131026' || errorCode === '131047';
          const recipientPhone = String(st?.recipient_id || '').trim();

          // Only count failures for Meta outgoing messages (not inbound, not other providers)
          const metaMsg = await WhatsAppMessage.findOne({
            $or: [{ waMessageId }, { externalMessageId: waMessageId }],
            direction: 'outbound',
            provider: 'meta',
          }).lean();

          if ((isBlockedError || status === 'failed') && recipientPhone && metaMsg) {
            let failedLead = await Lead.findOne({ phoneNumber: recipientPhone });

            // ── NUMBER NOT IN LEADS ──
            // Blocked/failed for a number that was never a lead (e.g. direct API send,
            // template sent before a lead record existed). Create a minimal lead so
            // the archive record is complete and the number can be restored later.
            if (!failedLead && isBlockedError) {
              console.log(`🗑️ [AUTO-DELETE] Phone ${recipientPhone} not in leads — creating record before archiving`);
              try {
                const { allocateNextLeadNumber: allocLeadNum } = await import('@/lib/crm/leadNumber');
                const newLeadNumber = await allocLeadNum().catch(() => null);
                failedLead = await Lead.create({
                  phoneNumber: recipientPhone,
                  leadNumber: newLeadNumber,
                  name: recipientPhone,
                  source: 'meta_webhook_auto',
                  status: 'blocked',
                  isBlocked: true,
                  waBlockedReason: `Auto-created from Meta error ${errorCode}`,
                  waBlockedAt: now,
                  createdAt: now,
                  updatedAt: now,
                });
              } catch (createErr) {
                console.warn('[AUTO-DELETE] Could not create lead record for blocked number:', createErr);
              }
            }

            if (failedLead && !failedLead.isBlocked) {
              const newCount = (failedLead.waFailCount || 0) + 1;
              const shouldAutoDelete = isBlockedError || newCount >= 3;

              if (shouldAutoDelete) {
                // Auto-delete: user blocked us OR 3 consecutive failures.
                // Save full snapshot to deleted_leads FIRST so it appears on the
                // Deleted Leads page and can be restored at any time.
                const deleteReason = isBlockedError
                  ? `Blocked by user (Meta error ${errorCode})`
                  : '3 consecutive delivery failures';
                console.log(`🗑️ [AUTO-DELETE] Lead ${failedLead._id} (${recipientPhone}) — ${deleteReason}`);

                try {
                  const { DeletedLead } = await import('@/lib/schemas/enterpriseSchemas');
                  await DeletedLead.create({
                    leadId: failedLead._id,
                    leadNumber: (failedLead as any).leadNumber || String(failedLead._id),
                    name: (failedLead as any).name || recipientPhone,
                    phoneNumber: recipientPhone,
                    email: (failedLead as any).email || '',
                    workshopName: (failedLead as any).workshopName || (failedLead as any).workshop || '',
                    assignedToUserId: (failedLead as any).assignedToUserId || (failedLead as any).userId || '',
                    createdByUserId: (failedLead as any).createdByUserId || '',
                    deletedByUserId: 'system',
                    status: (failedLead as any).status || '',
                    labels: (failedLead as any).labels || [],
                    source: (failedLead as any).source || '',
                    createdAtOriginal: (failedLead as any).createdAt,
                    updatedAtOriginal: (failedLead as any).updatedAt,
                    deletedAt: new Date(),
                    deletedReason: isBlockedError ? 'meta_blocked' : 'delivery_failed',
                    metadata: {
                      autoDeleteReason: deleteReason,
                      errorCode: errorCode?.toString(),
                      waMessageId,
                    },
                  });
                } catch (saveErr) {
                  console.warn('[AUTO-DELETE] Failed to save DeletedLead snapshot:', saveErr);
                }

                await Lead.deleteOne({ _id: failedLead._id });
                if (FunnelStageHistory) {
                  await FunnelStageHistory.deleteMany({ leadId: failedLead._id });
                }
              } else {
                // Not enough failures yet — track the count
                await Lead.updateOne({ _id: failedLead._id }, { $set: {
                  waFailCount: newCount,
                  waLastFailAt: now,
                  waLastFailCode: errorCode?.toString() || 'failed',
                }});
              }
            }
          }

          // Also update BroadcastRunMessage if this was part of a broadcast
          if (BroadcastRunMessage) {
            const broadcastUpdate: any = { status, updatedAt: now };
            if (status === 'delivered') broadcastUpdate.deliveredAt = now;
            if (status === 'read') broadcastUpdate.readAt = now;
            if (status === 'failed') {
              const err = Array.isArray(st?.errors) ? st.errors[0] : undefined;
              broadcastUpdate.failureReason = err?.title || err?.message || 'Failed';
              broadcastUpdate.failureCode = err?.code?.toString() || undefined;
            }
            if (isBlockedError) {
              broadcastUpdate.status = 'blocked';
            }
            
            const broadcastMsgResult = await BroadcastRunMessage.updateOne(
              { waMessageId },
              { $set: broadcastUpdate }
            );

            // ── Reconcile-by-phone fallback ───────────────────────────────────
            // If we couldn't match by waMessageId but Meta confirms a POSITIVE status
            // (sent/delivered/read), the original send likely succeeded but timed out
            // before we stored the id — so it got wrongly marked 'failed' and would be
            // re-sent. Trust Meta's confirmation: flip the most recent un-acked broadcast
            // message for this phone to the confirmed status so the retry loop stops.
            if (
              broadcastMsgResult.matchedCount === 0 &&
              recipientPhone &&
              ['sent', 'delivered', 'read'].includes(status)
            ) {
              const last10 = recipientPhone.replace(/\D/g, '').slice(-10);
              if (last10.length === 10) {
                const reconUpdate: any = { status, waMessageId, failureReason: null, reconciledByPhone: true, updatedAt: now };
                if (status === 'delivered') reconUpdate.deliveredAt = now;
                if (status === 'read') { reconUpdate.deliveredAt = now; reconUpdate.readAt = now; }
                await BroadcastRunMessage.findOneAndUpdate(
                  {
                    phoneNumber: { $regex: last10 + '$' },
                    status: { $in: ['failed', 'sending', 'pending'] },
                    $or: [{ waMessageId: { $exists: false } }, { waMessageId: null }, { waMessageId: '' }],
                    createdAt: { $gte: new Date(now.getTime() - 30 * 60 * 1000) },
                  },
                  { $set: reconUpdate },
                  { sort: { createdAt: -1 } }
                );
                console.log(`[WEBHOOK] Reconciled-by-phone broadcast message for ${last10} → ${status}`);
              }
            }

            // If a broadcast message was updated, also update the run stats
            if (broadcastMsgResult.modifiedCount > 0 && BroadcastRun) {
              const broadcastMsg = await BroadcastRunMessage.findOne({ waMessageId }).lean();
              if (broadcastMsg && (broadcastMsg as any).runId) {
                // Recalculate stats for the run
                // NOTE: Status is cumulative - a "read" message was also "delivered" and "sent"
                const runId = (broadcastMsg as any).runId;
                const statCounts = await BroadcastRunMessage.aggregate([
                  { $match: { runId } },
                  { $group: { _id: '$status', count: { $sum: 1 } } },
                ]);
                
                // Initialize stats - count based on highest status achieved
                const stats: any = { total: 0, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0, blocked: 0 };
                let readCount = 0, deliveredCount = 0, sentCount = 0, pendingCount = 0, failedCount = 0, skippedCount = 0, blockedCount = 0;
                
                for (const c of statCounts) {
                  const s = String(c._id || '').toLowerCase();
                  const cnt = Number(c.count || 0);
                  stats.total += cnt;
                  
                  // Count by actual status
                  if (s === 'read') readCount += cnt;
                  else if (s === 'delivered') deliveredCount += cnt;
                  else if (s === 'sent') sentCount += cnt;
                  else if (s === 'pending' || s === 'sending') pendingCount += cnt;
                  else if (s === 'failed') failedCount += cnt;
                  else if (s === 'skipped') skippedCount += cnt;
                  else if (s === 'blocked') blockedCount += cnt;
                }
                
                // Status is cumulative: read implies delivered implies sent
                // - read messages were also delivered and sent
                // - delivered messages were also sent
                stats.read = readCount;
                stats.delivered = deliveredCount + readCount; // delivered = explicitly delivered + read
                stats.sent = sentCount + deliveredCount + readCount; // sent = explicitly sent + delivered + read
                stats.pending = pendingCount;
                stats.failed = failedCount;
                stats.skipped = skippedCount;
                stats.blocked = blockedCount;
                
                await BroadcastRun.updateOne(
                  { _id: runId },
                  { $set: { stats, updatedAt: now } }
                );
              }
            }
          }

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
            let mediaError: string | undefined = undefined;
            const isMediaType = ['image', 'video', 'audio', 'document', 'sticker'].includes(type);
            
            if (isMediaType) {
              const mediaData = msg[type];
              const mediaId = mediaData?.id;
              
              if (mediaId) {
                try {
                  console.log(`[WEBHOOK MEDIA] Fetching media ID: ${mediaId} for type: ${type}`);
                  const metaMediaUrl = await getWhatsAppMediaUrl(mediaId, tenantCreds);
                  console.log(`[WEBHOOK MEDIA] Got Meta URL: ${metaMediaUrl?.substring(0, 80)}...`);
                  
                  if (!metaMediaUrl) {
                    throw new Error('Meta API returned empty media URL');
                  }
                  
                  const { buffer, contentType } = await downloadWhatsAppMedia(metaMediaUrl, tenantCreds);
                  console.log(`[WEBHOOK MEDIA] Downloaded ${buffer.length} bytes, type: ${contentType}`);
                  
                  if (!buffer || buffer.length === 0) {
                    throw new Error('Downloaded empty buffer from Meta');
                  }
                  
                  mimeType = contentType;
                  const extension = contentType.split('/')[1]?.split(';')[0] || 'bin';
                  const fileName = `whatsapp-inbound/${from}/${Date.now()}.${extension}`;

                  // Upload to Bunny CDN (permanent URL), fallback to S3
                  try {
                    s3MediaUrl = await uploadToBunnyStorage(buffer, fileName, { contentType });
                    console.log(`[WEBHOOK MEDIA] ✅ Uploaded to Bunny CDN: ${s3MediaUrl}`);
                  } catch (bunnyErr) {
                    console.warn('[WEBHOOK MEDIA] Bunny upload failed, falling back to S3:', bunnyErr);
                    s3MediaUrl = await uploadToS3(buffer, fileName, {
                      metadata: { 'wa-message-id': inboundWaMessageId || '', 'phone-number': from }
                    });
                    console.log(`[WEBHOOK MEDIA] ✅ Uploaded to S3 fallback: ${s3MediaUrl}`);
                  }
                } catch (mediaErr: any) {
                  mediaError = mediaErr?.message || 'Unknown media error';
                  console.error('[WEBHOOK MEDIA ERROR] Failed to process media:', mediaError);
                  console.error('[WEBHOOK MEDIA ERROR] Full error:', mediaErr);
                }
              } else {
                mediaError = 'No media ID in webhook payload';
                console.warn(`[WEBHOOK MEDIA] No media ID found for ${type} message`);
              }
            }

            // Extract Profile Name from contacts if available
            const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
            const profileName = contacts.find((c: any) => normalizePhone(String(c.wa_id)) === from)?.profile?.name || '';

            // Ensure Lead exists
            console.log(`[WEBHOOK DEBUG] Finding lead for ${from}`);
            let lead = await Lead.findOne(
              tenantUserId ? { phoneNumber: from, createdByUserId: tenantUserId } : { phoneNumber: from }
            );
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
                ...(tenantUserId ? { createdByUserId: tenantUserId, assignedToUserId: tenantUserId } : {}),
              });
              wasFirstInbound = true;

              if (tenantUserId) {
                // Tenant's own number — lead already assigned to the tenant, skip global round-robin
              } else {
                // Auto-assign to admin user via round-robin (if enabled)
                try {
                  console.log(`[WEBHOOK DEBUG] Auto-assigning lead to admin user`);
                  await assignLeadToNextAdmin(lead);
                } catch (assignErr) {
                  console.error('[WEBHOOK ERROR] Lead auto-assignment failed', assignErr);
                }
              }

              // Auto-add to main broadcast list
              try {
                  console.log(`[WEBHOOK DEBUG] Adding to broadcast list`);
                  await addLeadToMainBroadcastList(lead);
              } catch (blErr) {
                  console.error('[WEBHOOK ERROR] Broadcast list add failed', blErr);
              }
            } else {
              console.log(`[WEBHOOK DEBUG] Updating existing lead ${lead._id}`);
              // When customer sends a new message, reset status to 'new' and reopen if closed/overdue
              const updatePayload: any = { 
                lastMessageAt: now,
                chatStatus: 'new', // Reset to new when customer replies
                chatStatusClosedAt: null, // Clear closed timestamp
                chatStatusClosedBy: null, // Clear who closed it
                $addToSet: { labels: 'whatsapp' }
              };
              // Fill name if missing but Meta provided one
              if (!lead.name && profileName) {
                updatePayload.name = profileName;
              }
              
              await Lead.updateOne({ _id: lead._id }, updatePayload);
              console.log(`[WEBHOOK DEBUG] Lead ${lead._id} chatStatus reset to 'new' on inbound message`);
            }

            // Store message
            // For CRM: we want *our* business number in digits, not the user's number.
            // Meta provides display phone number like "+91 97790 06820".
            // Normalize it to digits so it's consistent.
            const ourDisplayPhone = value?.metadata?.display_phone_number
              ? String(value.metadata.display_phone_number)
              : '';
            const ourBusinessNumber = ourDisplayPhone ? normalizePhone(ourDisplayPhone) : undefined;
            
            // Determine message type - mark as 'media' if it was a media message (even if S3 upload failed)
            const finalMessageType = isMediaType ? 'media' : 'text';
            
            const insertData: any = {
              leadId: lead._id,
              phoneNumber: from,
              direction: 'inbound',
              messageType: finalMessageType,
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

            // Always save media info for media messages
            if (isMediaType) {
              // Map media types to schema-valid kinds
              // Schema enum: ['image', 'video', 'document', 'audio', 'sticker']
              const mediaKind = type === 'image' 
                ? 'image' 
                : type === 'sticker'
                  ? 'sticker'
                  : type === 'video' 
                    ? 'video' 
                    : type === 'audio'
                      ? 'audio'
                      : 'document';
                  
              insertData.media = {
                kind: mediaKind,
                url: s3MediaUrl || null, // May be null if upload failed
                mimeType: mimeType || null,
                error: mediaError || null, // Track why upload failed
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

            // ================================================================
            // STOP / OPT-OUT DETECTION (compliance)
            // STOP/UNSUBSCRIBE/BLOCK → BLOCK the lead (never delete: deleting
            // erases the opt-out itself, so a re-imported lead would get
            // broadcasts again) + confirm. START/UNSTOP → unblock + confirm.
            // Exact-match keywords only — "cancel" and sentences like "please
            // stop by the studio" must NOT opt anyone out.
            // ================================================================
            try {
              const { detectOptOutIntent } = await import('@/lib/qrOptOut');
              const normalizedBody = (body || '').toLowerCase().trim();
              const optIntent = detectOptOutIntent(body || '') || (normalizedBody === 'block' ? 'opt_out' : null);

              if (optIntent === 'opt_out') {
                await Lead.updateOne(
                  { _id: lead._id },
                  { $set: { isBlocked: true, status: 'blocked', waBlockedReason: `User replied "${normalizedBody}"`, waBlockedAt: now } }
                );
                console.log(`🚫 [OPT-OUT] Lead ${lead._id} (${from}) blocked — keyword: "${normalizedBody}"`);
                const { sendWhatsAppText } = await import('@/lib/whatsapp');
                sendWhatsAppText(
                  from,
                  'You have been unsubscribed and will not receive further messages. Reply START anytime to subscribe again. 🙏',
                  tenantCreds
                ).catch((e) => console.warn('[OPT-OUT] Confirmation send failed:', e?.message));
                continue;
              }

              if (optIntent === 'opt_in' && lead.isBlocked) {
                await Lead.updateOne(
                  { _id: lead._id },
                  { $set: { isBlocked: false }, $unset: { waBlockedReason: 1, waBlockedAt: 1 } }
                );
                console.log(`✅ [OPT-IN] Lead ${lead._id} (${from}) unblocked`);
                const { sendWhatsAppText } = await import('@/lib/whatsapp');
                sendWhatsAppText(from, 'Welcome back! You are subscribed again. 🙏', tenantCreds)
                  .catch((e) => console.warn('[OPT-IN] Confirmation send failed:', e?.message));
                continue;
              }
            } catch (optErr: any) {
              console.warn('[OPT-OUT] Detection failed (non-fatal):', optErr?.message);
            }

            // If lead is already blocked, skip automations but still store message
            if (lead.isBlocked) {
              console.log(`🚫 [BLOCKED] Skipping automations for blocked lead ${lead._id} (phone: ${from})`);
              continue;
            }

            // Trigger automation logic
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
