import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { RateLimitManager } from '@/lib/rateLimitManager';
import { BulkMessageManager, BULK_CONFIG } from '@/lib/bulkMessageManager';
import { BroadcastRun, BroadcastRunMessage, Lead, WhatsAppMessage, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, getPublicMediaUrl } from '@/lib/whatsapp';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export type BroadcastRunsProcessResult = {
  scannedRuns: number;
  executedRuns: number;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  runResults: Array<{ runId: string; status: 'ok' | 'error'; attempted: number; sent: number; failed: number; skipped: number; error?: string }>;
};

async function markRunStats(runId: any) {
  const counts = await BroadcastRunMessage.aggregate([
    { $match: { runId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const map = new Map<string, number>();
  counts.forEach((c: any) => map.set(String(c._id).toLowerCase(), Number(c.count || 0)));

  // Count by actual status
  const pendingRaw = map.get('pending') || 0;
  const sendingRaw = map.get('sending') || 0;
  const sentRaw = map.get('sent') || 0;
  const deliveredRaw = map.get('delivered') || 0;
  const readRaw = map.get('read') || 0;
  const failed = map.get('failed') || 0;
  const skipped = map.get('skipped') || 0;
  const blocked = map.get('blocked') || 0;
  
  // Status is cumulative: read implies delivered implies sent
  const read = readRaw;
  const delivered = deliveredRaw + readRaw;
  const sent = sentRaw + deliveredRaw + readRaw;
  const pending = pendingRaw + sendingRaw;
  const total = pending + sent + failed + skipped + blocked;

  await BroadcastRun.updateOne(
    { _id: runId },
    {
      $set: {
        'stats.total': total,
        'stats.pending': pending,
        'stats.sent': sent,
        'stats.delivered': delivered,
        'stats.read': read,
        'stats.failed': failed,
        'stats.skipped': skipped,
        'stats.blocked': blocked,
        updatedAt: new Date(),
      },
    }
  );

  return { total, pending, sent, delivered, read, failed, skipped, blocked };
}

// Helper function to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function processDueBroadcastRuns(options?: {
  now?: Date;
  runLimit?: number;
  perRunMessageLimit?: number;
}): Promise<BroadcastRunsProcessResult> {
  await connectDB();

  const now = options?.now || new Date();
  const runLimit = Math.min(Math.max(1, options?.runLimit ?? 5), 50);
  // Reduced default batch to 30 messages per cron run for reliability
  const perRunMessageLimit = Math.min(Math.max(1, options?.perRunMessageLimit ?? 30), 1000);

  console.log('[Broadcast] Processing with runLimit:', runLimit, 'perRunMessageLimit:', perRunMessageLimit);

  const due = await BroadcastRun.find({
    status: { $in: ['draft', 'scheduled', 'running'] },
    $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }, { scheduledAt: { $lte: now } }],
  })
    .sort({ scheduledAt: 1, createdAt: 1 })
    .limit(runLimit)
    .lean();

  // Reset messages stuck in 'sending' for more than 5 minutes back to 'pending'
  // This handles cases where the process crashed or timed out mid-send
  const staleThreshold = new Date(now.getTime() - 5 * 60 * 1000);
  for (const run of due) {
    const resetResult = await BroadcastRunMessage.updateMany(
      {
        runId: (run as any)._id,
        status: 'sending',
        updatedAt: { $lt: staleThreshold },
      },
      { $set: { status: 'pending', failureReason: 'Reset from stale sending state', updatedAt: now } }
    );
    if (resetResult.modifiedCount > 0) {
      console.log(`[Broadcast] Reset ${resetResult.modifiedCount} stale 'sending' messages to 'pending' for run ${(run as any)._id}`);
    }
  }

  console.log('[Broadcast] Found', due.length, 'due runs');

  const result: BroadcastRunsProcessResult = {
    scannedRuns: due.length,
    executedRuns: 0,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    runResults: [],
  };

  for (const run of due) {
    const runId = String((run as any)._id);
    console.log('[Broadcast] Processing run:', runId, 'provider:', (run as any).provider);
    const stat: BroadcastRunsProcessResult['runResults'][number] = {
      runId,
      status: 'ok',
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: undefined,
    };

    try {
      // Move to running state if not already.
      await BroadcastRun.updateOne(
        { _id: (run as any)._id, status: { $in: ['draft', 'scheduled', 'running'] } },
        { $set: { status: 'running', startedAt: (run as any).startedAt || now, updatedAt: now }, $unset: { lastError: 1 } }
      );

      // Load template
      const templateId = String((run as any).templateId || '').trim();
      const template = templateId ? await WhatsAppTemplate.findById(templateId).lean() : null;
      if (!template) {
        throw new Error('Template not found for run');
      }

      // Templates are chargeable and can be sent anytime - no approval check required
      const runProvider = String((run as any).provider || 'meta');

      // Fetch pending messages
      const pending = await BroadcastRunMessage.find({ runId: (run as any)._id, status: 'pending' })
        .sort({ createdAt: 1 })
        .limit(perRunMessageLimit)
        .lean();

      if (pending.length === 0) {
        const counts = await markRunStats((run as any)._id);
        if (counts.pending === 0) {
          await BroadcastRun.updateOne(
            { _id: (run as any)._id },
            { $set: { status: 'completed', completedAt: now, updatedAt: now } }
          );
        }
        result.runResults.push(stat);
        continue;
      }

      result.executedRuns++;

      // Best-effort createdBy id label for rate-limit.
      const createdBy = String((run as any).createdByUserId || 'broadcast');

      // Track phones already processed in this run to prevent duplicate sends at runtime
      const processedPhones = new Set<string>();
      // Pre-load phones already sent in this run (from previous batches)
      const alreadySent = await BroadcastRunMessage.find({
        runId: (run as any)._id,
        status: { $in: ['sent', 'delivered', 'read', 'sending'] },
      }).select({ phoneNumber: 1 }).lean();
      for (const m of alreadySent) {
        const norm = normalizePhone(String((m as any).phoneNumber || ''));
        if (norm) processedPhones.add(norm);
      }

      for (const item of pending) {
        const leadId = String((item as any).leadId || '').trim();
        const to = normalizePhone(String((item as any).phoneNumber || ''));

        if (!to || !leadId) {
          await BroadcastRunMessage.updateOne({ _id: (item as any)._id }, { $set: { status: 'skipped', failureReason: 'Missing phone/leadId', updatedAt: now } });
          stat.skipped++;
          result.skipped++;
          continue;
        }

        // Skip duplicate phone numbers within the same run
        if (processedPhones.has(to)) {
          await BroadcastRunMessage.updateOne({ _id: (item as any)._id }, { $set: { status: 'skipped', failureReason: 'Duplicate phone in same run', updatedAt: now } });
          stat.skipped++;
          result.skipped++;
          continue;
        }
        processedPhones.add(to);

        // Consent / opt-out compliance
        const compliance = await ConsentManager.validateCompliance(to);
        if (!compliance.compliant) {
          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            { $set: { status: 'skipped', failureReason: compliance.reason || 'Not compliant', updatedAt: now } }
          );
          stat.skipped++;
          result.skipped++;
          continue;
        }

        // Rate limit guard
        const canSend = await RateLimitManager.canSendMessage(createdBy, to);
        if (!canSend.allowed) {
          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            { $set: { status: 'failed', failureReason: canSend.reason || 'Rate limit reached', updatedAt: now } }
          );
          stat.failed++;
          result.failed++;
          continue;
        }

        // Check daily bulk quota
        const quotaCheck = await BulkMessageManager.canSendToday(1);
        if (!quotaCheck.allowed) {
          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            { $set: { status: 'failed', failureReason: quotaCheck.reason || 'Daily quota exhausted', updatedAt: now } }
          );
          stat.failed++;
          result.failed++;
          // Stop processing this run if quota is exhausted
          console.log('[Broadcast] Daily quota exhausted, stopping run');
          break;
        }

        // Mark as sending
        await BroadcastRunMessage.updateOne({ _id: (item as any)._id, status: 'pending' }, { $set: { status: 'sending', updatedAt: now } });

        // Route-level API stores WhatsAppMessage; we do it here to fully control tracking.
        const msg = await WhatsAppMessage.create({
          leadId: leadId,
          phoneNumber: to,
          direction: 'outbound',
          messageType: 'template',
          templateId: (template as any)._id,
          templateVariables: {},
          messageContent: String((template as any).templateContent || '').trim() || '(template)',
          status: 'queued',
          sentAt: now,
          provider: 'pending',
          metadata: {
            broadcast: { runId: String((run as any)._id) },
            template: {
              templateName: (template as any).templateName,
              headerFormat: (template as any).headerFormat,
              headerContent: (template as any).headerContent,
              footerText: (template as any).footerText,
              buttons: Array.isArray((template as any).buttons) ? (template as any).buttons : [],
              headerMedia: (template as any).headerMedia || null,
            },
          },
        });

        stat.attempted++;
        result.attempted++;

        try {
          // Use the provider specified in the broadcast run ('meta' or 'qr')
          const runProvider = String((run as any).provider || 'meta');
          
          let apiResult: any;
          
          if (runProvider === 'qr') {
            // Send via QR Bridge using /send endpoint (same as single message send)
            const { url: bridgeUrl, secret: bridgeSecret } = getWhatsAppBridgeConfig();
            
            // Build template message content with header, body, footer
            // Clean templateContent - remove [QUICK_REPLY] markers and button lines
            const rawContent = String((template as any).templateContent || '').trim();
            const templateContent = rawContent
              .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '') // Remove • [QUICK_REPLY] lines
              .replace(/\[QUICK_REPLY\][^\n]*/gi, '')     // Remove [QUICK_REPLY] lines
              .replace(/\n{3,}/g, '\n\n')                  // Collapse multiple newlines
              .trim();
            
            const headerText = (template as any).headerContent ? String((template as any).headerContent).trim() : '';
            const footerText = (template as any).footerText ? String((template as any).footerText).trim() : '';
            const buttons = Array.isArray((template as any).buttons) ? (template as any).buttons : [];
            
            // Format message: Body only (header/footer already in template body for QR)
            let fullMessage = templateContent;
            
            // Extract button titles for native buttons attempt
            const buttonTitles = buttons
              .filter((b: any) => b.title)
              .map((b: any) => String(b.title).substring(0, 20));
            
            // Prepare text fallback for buttons
            const buttonTexts = buttonTitles
              .map((title: string, i: number) => `${['1️⃣', '2️⃣', '3️⃣'][i] || `${i+1}.`} ${title}`)
              .join('\n');
            const fullMessageWithButtonText = buttonTexts 
              ? `${templateContent}\n\n📲 Reply with number:\n${buttonTexts}` 
              : templateContent;
            
            // Check for header media (image) — check imageFile (new) first, then headerMedia (legacy)
            const headerMedia = (template as any).headerMedia;
            const imageFile = (template as any).imageFile;
            const headerFormat = String((template as any).headerFormat || '').toUpperCase();
            let mediaUrl: string | null =
              imageFile?.url ||
              headerMedia?.url || headerMedia?.link ||
              ((headerFormat === 'IMAGE' || headerFormat === 'VIDEO') ? (template as any).headerContent : null) ||
              null;
            const hasImage = !!(mediaUrl && (
              headerFormat === 'IMAGE' ||
              headerMedia?.kind === 'image' ||
              imageFile?.url
            ));

            // Convert S3/private URLs to public signed URLs
            if (hasImage && mediaUrl) {
              mediaUrl = await getPublicMediaUrl(mediaUrl);
            }
            
            console.log('[Broadcast QR] Sending to:', to, 'via', bridgeUrl);
            console.log('[Broadcast QR] Has image:', hasImage, 'URL:', mediaUrl?.substring(0, 80));
            console.log('[Broadcast QR] Buttons:', buttonTitles.length, buttonTitles);
            
            let bridgeResponse: Response;

            if (hasImage) {
              // Always use /send-template for image messages so image + text arrive together
              console.log('[Broadcast QR] Using /send-template (image + text)');
              bridgeResponse = await fetchWithTimeout(`${bridgeUrl}/send-template`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-bridge-secret': bridgeSecret,
                },
                body: JSON.stringify({
                  to,
                  imageUrl: mediaUrl,
                  bodyText: templateContent,
                  ...(buttonTitles.length > 0 ? { buttons: buttonTitles } : {}),
                  ...(footerText ? { footerText } : {}),
                }),
                cache: 'no-store',
              }, 20000);
            } else {
              // No image — text / buttons only
              let bridgePayload: any = { to, type: 'text' };
              if (buttonTitles.length > 0) {
                bridgePayload.type = 'buttons';
                bridgePayload.message = templateContent;
                bridgePayload.buttons = buttonTitles;
              } else {
                bridgePayload.message = fullMessageWithButtonText;
              }
              
              console.log('[Broadcast QR] Payload:', JSON.stringify(bridgePayload, null, 2).substring(0, 500));
              
              bridgeResponse = await fetchWithTimeout(`${bridgeUrl}/send`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-bridge-secret': bridgeSecret,
                },
                body: JSON.stringify(bridgePayload),
                cache: 'no-store',
              }, 20000);
              
              // If native buttons failed, fallback to text format
              if (!bridgeResponse.ok && bridgePayload.type === 'buttons') {
                console.log('[Broadcast QR] Native buttons failed, falling back to text format');
                bridgePayload = {
                  to: to,
                  type: 'text',
                  message: fullMessageWithButtonText,
                };
                bridgeResponse = await fetchWithTimeout(`${bridgeUrl}/send`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'x-bridge-secret': bridgeSecret,
                  },
                  body: JSON.stringify(bridgePayload),
                  cache: 'no-store',
                }, 20000);
              }
            }
            
            if (!bridgeResponse.ok) {
              const errText = await bridgeResponse.text().catch(() => '');
              console.error('[Broadcast QR] Bridge error:', bridgeResponse.status, errText);
              throw new Error(`QR Bridge error: ${bridgeResponse.status} - ${errText}`);
            }
            
            const bridgeData = await bridgeResponse.json();
            console.log('[Broadcast QR] Bridge response:', bridgeData);
            apiResult = {
              waMessageId: bridgeData?.id || bridgeData?.messageId || bridgeData?.key?.id || `qr_${Date.now()}`,
              raw: { provider: 'qr' },
            };
          } else {
            // Send via Meta Cloud API (default)
            const { buildCloudTemplateSendInput, sendWhatsAppTemplate, sendWhatsAppText } = await import('@/lib/whatsapp');

            try {
              // Log template details for debugging
              console.log('[Broadcast Meta] Template name:', (template as any).templateName);
              console.log('[Broadcast Meta] Template headerMedia:', JSON.stringify((template as any).headerMedia));
              console.log('[Broadcast Meta] Template buttons:', JSON.stringify((template as any).buttons));
              console.log('[Broadcast Meta] Template imageFile:', JSON.stringify((template as any).imageFile));
              
              const cloudInput = buildCloudTemplateSendInput(template, to);
              console.log('[Broadcast Meta] Cloud input:', JSON.stringify(cloudInput, null, 2));
              apiResult = await sendWhatsAppTemplate(cloudInput);
              console.log('[Broadcast Meta] Send result:', apiResult);
            } catch (templateErr: any) {
              console.error('[Broadcast Meta] Template send failed:', templateErr?.message, templateErr?.data);
              // Don't fall back to text - throw the error
              throw templateErr;
            }
          }

          await WhatsAppMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'sent',
                waMessageId: apiResult.waMessageId,
                provider: apiResult?.raw?.provider || 'sent',
                updatedAt: new Date(),
              },
              $unset: { failureReason: 1, nextRetryAt: 1 },
            }
          );

          if (!apiResult.waMessageId) {
            console.warn('[Broadcast] WARNING: Message marked as sent but waMessageId is undefined. API Result:', JSON.stringify(apiResult));
          }

          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            {
              $set: {
                status: 'sent',
                waMessageId: apiResult.waMessageId,
                provider: apiResult?.raw?.provider || 'sent',
                whatsappMessageId: msg._id,
                sentAt: now,
                updatedAt: new Date(),
              },
              $unset: { failureReason: 1 },
            }
          );

          await RateLimitManager.incrementCount(createdBy, to);
          
          // Increment daily bulk quota
          await BulkMessageManager.incrementDailyUsage(1);

          stat.sent++;
          result.sent++;
          
          // Add delay between messages (only when interval is enabled — typically QR provider)
          const intervalEnabled = (run as any).messageInterval?.enabled !== false;
          if (intervalEnabled) {
            // ─── SMART BROADCAST SCHEDULING ───
            // Default: 10-20 seconds between messages (prevents WhatsApp 24-hour blocks)
            // WhatsApp blocks accounts that send >100 msgs rapidly to same group
            // Delays are safety: 10-20s = ~180-360 msgs per hour (well within limits)
            // Best practice: 10 msgs per 2 hours = 5 msgs every 60 mins (super safe)
            const minSec = (run as any).messageInterval?.minSeconds ?? 10;   // Increased from 5
            const maxSec = (run as any).messageInterval?.maxSeconds ?? 20;   // Increased from 15
            const randomDelayMs = (Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec) * 1000;
            console.log(`[Broadcast] Waiting ${randomDelayMs / 1000}s before next message (min: ${minSec}s, max: ${maxSec}s, prevents WhatsApp 24h blocks)`);
            await new Promise(resolve => setTimeout(resolve, randomDelayMs));
          } else {
            // Minimal 2s gap to avoid hammering the API even without intervals
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'WhatsApp send failed';
          
          // Categorize error type for better reporting
          let errorCategory = 'unknown';
          const errorLower = errorMsg.toLowerCase();
          
          if (errorLower.includes('not a valid whatsapp') || 
              errorLower.includes('recipient is not a valid') ||
              errorLower.includes('does not exist') ||
              errorLower.includes('invalid parameter') && errorLower.includes('phone')) {
            errorCategory = 'invalid_number';
          } else if (errorLower.includes('not registered') || 
                     errorLower.includes('number not on whatsapp') ||
                     errorLower.includes('wa_recipient_not_found')) {
            errorCategory = 'not_on_whatsapp';
          } else if (errorLower.includes('rate limit') || errorLower.includes('too many') || errorLower.includes('throttle')) {
            // CRITICAL: Rate limit detected — pause sends temporarily
            errorCategory = 'rate_limited';
            console.warn(`[Broadcast] ⚠️ RATE LIMIT DETECTED for ${to}. WhatsApp is throttling. Adding 30s safety pause to prevent account action.`);
            // Additional safety pause to prevent account restrictions
            await new Promise(resolve => setTimeout(resolve, 30000)); // 30s pause
          } else if (errorLower.includes('blocked') || errorLower.includes('opt-out') || (errorLower.includes('account') && errorLower.includes('action'))) {
            errorCategory = 'blocked';
            console.error(`[Broadcast] 🚫 ACCOUNT ACTION DETECTED. WhatsApp may be restricting this account. Pausing all sends.`);
          } else if (errorLower.includes('template') && (errorLower.includes('paused') || errorLower.includes('rejected'))) {
            errorCategory = 'template_issue';
          }
          
          const failureReason = `[${errorCategory}] ${errorMsg}`;
          console.log(`[Broadcast] Message failed for ${to}: ${failureReason}`);

          await WhatsAppMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'failed',
                failureReason: failureReason,
                updatedAt: new Date(),
              },
            }
          );

          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            {
              $set: {
                status: 'failed',
                failureReason: failureReason,
                errorCategory: errorCategory,
                whatsappMessageId: msg._id,
                updatedAt: new Date(),
              },
            }
          );

          stat.failed++;
          result.failed++;
          
          // Continue to next message (don't stop on error)
          console.log(`[Broadcast] Continuing to next message after failure...`);
        }
      }

      // refresh run stats and maybe complete
      const counts = await markRunStats((run as any)._id);
      if (counts.pending === 0) {
        await BroadcastRun.updateOne(
          { _id: (run as any)._id },
          { $set: { status: 'completed', completedAt: new Date(), updatedAt: new Date() } }
        );
      }

      result.runResults.push(stat);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Broadcast run error';
      stat.status = 'error';
      stat.error = msg;
      result.runResults.push(stat);

      await BroadcastRun.updateOne(
        { _id: (run as any)._id },
        { $set: { status: 'failed', lastError: String(msg), updatedAt: new Date() } }
      );
    }
  }

  return result;
}

/**
 * Process a specific broadcast run by ID.
 * This bypasses the scheduledAt check and forces immediate processing.
 * Useful for the "Run Now" button in the UI.
 */
export async function processSpecificBroadcastRun(
  runId: string,
  options?: { perRunMessageLimit?: number }
): Promise<BroadcastRunsProcessResult> {
  await connectDB();

  const run = await BroadcastRun.findById(runId).lean();
  
  if (!run) {
    return {
      scannedRuns: 0,
      executedRuns: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      runResults: [{ runId, status: 'error', attempted: 0, sent: 0, failed: 0, skipped: 0, error: 'Run not found' }],
    };
  }

  // Check if run is in a processable state
  const status = String((run as any).status || '');
  if (!['draft', 'scheduled', 'running'].includes(status)) {
    return {
      scannedRuns: 1,
      executedRuns: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      runResults: [{ runId, status: 'error', attempted: 0, sent: 0, failed: 0, skipped: 0, error: `Run is in '${status}' state, cannot process` }],
    };
  }

  // Use the existing processor but with this specific run
  // We fake the query to include only this run
  const perRunMessageLimit = Math.min(Math.max(1, options?.perRunMessageLimit ?? 200), 1000);
  
  // Call the main processor with runLimit=1, but it will only find runs that are "due"
  // Since we want to force this specific run, we'll process it directly
  
  console.log(`[Broadcast] Processing specific run ${runId} with perRunMessageLimit=${perRunMessageLimit}`);
  
  // Process by calling the main function but ensure this run is picked up
  // We do this by temporarily setting scheduledAt to now-1sec
  const now = new Date();
  await BroadcastRun.updateOne(
    { _id: runId },
    { $set: { scheduledAt: new Date(now.getTime() - 1000), updatedAt: now } }
  );

  // Now call the regular processor - it will pick up this run
  const result = await processDueBroadcastRuns({
    now,
    runLimit: 1,
    perRunMessageLimit,
  });

  return result;
}
