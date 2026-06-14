import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { RateLimitManager } from '@/lib/rateLimitManager';
import { BulkMessageManager, BULK_CONFIG } from '@/lib/bulkMessageManager';
import { checkRateLimit, reserveSendSlot } from '@/lib/qrSendRateLimit';
import { calculateVariableGapsWithBreaks } from '@/lib/whatsappGapCalculator';
import { BroadcastRun, BroadcastRunMessage, Lead, WhatsAppMessage, WhatsAppTemplate, CRMUserSettings, getQrWhatsAppMessage, getQrWhatsAppChat, DeletedLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, getPublicMediaUrl } from '@/lib/whatsapp';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';

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

// IST = UTC+5:30. Quiet window: 10:30 PM to 5:00 AM IST (QR only, no messages during this period).
function getQrQuietHoursInfo(now: Date): { isQuiet: boolean; resumeAt: Date } {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + IST_OFFSET_MS);
  const istHours = istTime.getUTCHours();
  const istMinutes = istTime.getUTCMinutes();
  const istTotalMin = istHours * 60 + istMinutes;

  // Quiet: 22:30 (1350 min) to 05:00 (300 min)
  const isQuiet = istTotalMin >= 1350 || istTotalMin < 300;
  if (!isQuiet) return { isQuiet: false, resumeAt: now };

  // Resume at 5:00 AM IST — build in IST then convert back to UTC
  const resumeIST = new Date(istTime);
  resumeIST.setUTCHours(5, 0, 0, 0);
  if (istTotalMin >= 1350) {
    // Past 10:30 PM — 5 AM is on the next calendar day in IST
    resumeIST.setUTCDate(resumeIST.getUTCDate() + 1);
  }
  const resumeAt = new Date(resumeIST.getTime() - IST_OFFSET_MS);
  return { isQuiet: true, resumeAt };
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
  const perRunMessageLimit = Math.min(Math.max(1, options?.perRunMessageLimit ?? 50), 1000);

  console.log('[Broadcast] Processing with runLimit:', runLimit, 'perRunMessageLimit:', perRunMessageLimit);

  const due = await BroadcastRun.find({
    status: { $in: ['draft', 'scheduled', 'running'] },
    $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }, { scheduledAt: { $lte: now } }],
  })
    .sort({ scheduledAt: 1, createdAt: 1 })
    .limit(runLimit)
    .lean();

  // Reset messages stuck in 'sending' for more than 2 minutes back to 'pending'
  // (cron timeout is 60s; 2 min gives one full extra cron cycle before recovery)
  const staleThreshold = new Date(now.getTime() - 2 * 60 * 1000);
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
      // ── EXPIRY: a scheduled broadcast that hasn't sent within BROADCAST_EXPIRY_HOURS
      // (default 24h) of its scheduled/started time is expired — remaining unsent messages
      // are skipped (NOT sent late) and the run is closed. Prevents stale messages firing
      // days later after long pauses, retries, or cron downtime.
      // Anchor on startedAt (immutable once set); fall back to scheduledAt for runs that
      // never started (e.g. cron was down). Both are stable for an un-started run.
      const expiryHours = Number(process.env.BROADCAST_EXPIRY_HOURS) || 24;
      const expiryAnchor = (run as any).startedAt
        ? new Date((run as any).startedAt)
        : ((run as any).scheduledAt ? new Date((run as any).scheduledAt) : null);
      if (expiryAnchor && expiryAnchor.getTime() < now.getTime() - expiryHours * 60 * 60 * 1000) {
        await BroadcastRunMessage.updateMany(
          { runId: (run as any)._id, status: { $in: ['pending', 'sending', 'retrying'] } },
          { $set: { status: 'skipped', failureReason: `Expired — not sent within ${expiryHours}h of schedule`, errorCategory: 'expired', updatedAt: now } }
        );
        await markRunStats((run as any)._id);
        await BroadcastRun.updateOne(
          { _id: (run as any)._id },
          { $set: { status: 'completed', completedAt: now, lastError: `Auto-expired after ${expiryHours}h`, updatedAt: now } }
        );
        console.log(`[Broadcast] ⌛ Run ${runId} expired (>${expiryHours}h since schedule) — remaining messages skipped, not sent`);
        result.runResults.push(stat);
        continue;
      }

      // Quiet hours check for QR: no sends 10:30 PM – 5:00 AM IST
      if (String((run as any).provider || 'meta') === 'qr') {
        const { isQuiet, resumeAt } = getQrQuietHoursInfo(now);
        if (isQuiet) {
          await BroadcastRun.updateOne(
            { _id: (run as any)._id },
            { $set: { status: 'scheduled', scheduledAt: resumeAt, updatedAt: now } }
          );
          console.log(`[Broadcast QR] Quiet hours (10:30 PM–5 AM IST). Paused. Resuming at ${resumeAt.toISOString()} UTC`);
          result.runResults.push(stat);
          continue;
        }
      }

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

      // ── QR: Verify bridge is connected BEFORE touching any messages ──
      // If WhatsApp is logged out, we must NOT keep retrying — it triggers ban escalation.
      if (runProvider === 'qr') {
        const { url: _bridgeUrl, secret: _bridgeSecret } = getWhatsAppBridgeConfig();
        const _runUserId = String((run as any).createdByUserId || '');
        const _userSettings = _runUserId
          ? await CRMUserSettings.findOne({ userId: _runUserId }, { permanentTenantId: 1, qrBridgeUrl: 1 }).lean()
          : null;
        const _sessionKey = (_userSettings as any)?.permanentTenantId || _runUserId;
        const _resolvedBridgeUrl = (_userSettings as any)?.qrBridgeUrl?.trim() || _bridgeUrl;
        const _statusHeaders: Record<string, string> = {
          'x-bridge-secret': _bridgeSecret,
          'x-user-id': _runUserId,
          'x-session-key': _sessionKey,
          'x-tenant-id': _sessionKey,
        };
        let bridgeOnline = false;
        let whatsappConnected = false;
        try {
          const statusRes = await fetchWithTimeout(`${_resolvedBridgeUrl}/status`, { method: 'GET', headers: _statusHeaders, cache: 'no-store' }, 8000);
          if (statusRes.ok) {
            const statusData = await statusRes.json().catch(() => ({}));
            bridgeOnline = true;
            whatsappConnected = statusData?.connected === true;
          }
        } catch (_) { /* bridge unreachable */ }

        if (!bridgeOnline) {
          // Bridge process down — pause 15 min and try later
          const resumeAt = new Date(now.getTime() + 15 * 60 * 1000);
          await BroadcastRun.updateOne({ _id: (run as any)._id }, { $set: { status: 'scheduled', scheduledAt: resumeAt, lastError: 'QR bridge unreachable — auto-paused 15 min', updatedAt: now } });
          console.log(`[Broadcast QR] Bridge unreachable — paused run ${runId} for 15 min`);
          result.runResults.push(stat);
          continue;
        }
        if (!whatsappConnected) {
          // WhatsApp session logged out — pause 2 hours. Do NOT retry fast — that escalates ban risk.
          const resumeAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          await BroadcastRun.updateOne({ _id: (run as any)._id }, { $set: { status: 'scheduled', scheduledAt: resumeAt, lastError: 'WhatsApp disconnected — auto-paused 2 hrs to reduce ban risk', updatedAt: now } });
          console.log(`[Broadcast QR] WhatsApp not connected — paused run ${runId} for 2 hrs`);
          result.runResults.push(stat);
          continue;
        }

        // ── QR PACING GATE ──────────────────────────────────────────────
        // Cron fires every minute, but QR must average ~15 msgs/hour (one
        // every ~3-5 min). Pacing is PERSISTED on the run (nextQrSendAt) so
        // it survives across separate 1-minute cron invocations. Never
        // sleep in-process here — that previously let each tick send its
        // own "warm-up" pair of messages ~30s apart (~2/min = ~120/hr),
        // which got the number banned.
        const nextQrSendAt = (run as any).nextQrSendAt ? new Date((run as any).nextQrSendAt) : null;
        if (nextQrSendAt && now.getTime() < nextQrSendAt.getTime()) {
          result.runResults.push(stat);
          continue;
        }
      }

      // Auto-retry transient failures: reset rate-limited / timeout messages back to pending
      // (do NOT retry permanent failures like invalid_number).
      // POLICY: wait 8h between attempts, retry at most MAX_RETRY_ATTEMPTS times.
      // => up to 3 sends total per recipient (1 original + 2 retries). After that the message
      // stays permanently 'failed' for MANUAL resend — it is never auto-reset to pending again.
      const MAX_RETRY_ATTEMPTS = 2;             // 2 retries (3 sends total)
      const RETRY_GAP_MS = 8 * 60 * 60 * 1000;  // 8 hours between attempts
      const retryablePattern = /rate_limit|rate limit|too many|throttle|timeout|network|econnreset|socket|503|529/i;
      await BroadcastRunMessage.updateMany(
        {
          runId: (run as any)._id,
          status: 'failed',
          failureReason: { $regex: retryablePattern },
          updatedAt: { $lt: new Date(now.getTime() - RETRY_GAP_MS) }, // only retry 8h after the last attempt
          $or: [{ retryCount: { $exists: false } }, { retryCount: { $lt: MAX_RETRY_ATTEMPTS } }],
        },
        { $set: { status: 'pending', failureReason: null, updatedAt: now }, $inc: { retryCount: 1 } }
      );
      // After 2 retries (3 sends total), stop auto-retrying — leave it permanently failed for manual resend.
      await BroadcastRunMessage.updateMany(
        {
          runId: (run as any)._id,
          status: 'failed',
          failureReason: { $regex: retryablePattern },
          retryCount: { $gte: MAX_RETRY_ATTEMPTS },
        },
        { $set: { failureReason: 'Failed after 2 retries — manual resend required', errorCategory: 'exhausted', updatedAt: now } }
      );

      // Helper: a run isn't truly "done" while it still has failed messages waiting for an
      // 8h retry. Counts messages eligible for a future auto-retry so we can keep the run
      // alive (scheduled) instead of marking it completed and never retrying them.
      const countRetryEligible = () => BroadcastRunMessage.countDocuments({
        runId: (run as any)._id,
        status: 'failed',
        failureReason: { $regex: retryablePattern },
        $or: [{ retryCount: { $exists: false } }, { retryCount: { $lt: MAX_RETRY_ATTEMPTS } }],
      });

      // Safety guard: cancel stale pending messages if the run itself is cancelled/failed
      const currentRun = await BroadcastRun.findOne({ _id: (run as any)._id }).lean() as any;
      if (currentRun && ['cancelled', 'canceled', 'failed'].includes(currentRun.status)) {
        await BroadcastRunMessage.updateMany(
          { runId: (run as any)._id, status: { $in: ['pending', 'sending', 'retrying'] } },
          { $set: { status: 'cancelled', failureReason: 'Parent run cancelled', updatedAt: now } }
        );
        console.log(`[Broadcast] ⚠️ Skipping cancelled/failed run ${(run as any)._id} — cleaned up stale messages`);
        continue;
      }

      // Fetch pending messages. QR is capped at ONE message per cron tick —
      // pacing between sends is enforced via the persisted nextQrSendAt gate
      // above, not by batching multiple messages into a single tick.
      const fetchLimit = runProvider === 'qr' ? 1 : perRunMessageLimit;
      const pending = await BroadcastRunMessage.find({ runId: (run as any)._id, status: 'pending' })
        .sort({ createdAt: 1 })
        .limit(fetchLimit)
        .lean();

      if (pending.length === 0) {
        const counts = await markRunStats((run as any)._id);
        if (counts.pending === 0) {
          // Keep the run alive if failed messages are still due for an 8h retry.
          if ((await countRetryEligible()) > 0) {
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              { $set: { status: 'scheduled', scheduledAt: new Date(now.getTime() + RETRY_GAP_MS), updatedAt: now } }
            );
          } else {
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              { $set: { status: 'completed', completedAt: now, updatedAt: now } }
            );
          }
        }
        result.runResults.push(stat);
        continue;
      }

      result.executedRuns++;

      // Best-effort createdBy id label for rate-limit.
      const createdBy = String((run as any).createdByUserId || 'broadcast');

      // If this tenant has connected their own Meta WhatsApp number, send
      // from that number; otherwise null → falls back to the global env
      // (legacy/default number) inside sendWhatsAppTemplate.
      const metaCreds = runProvider === 'meta' ? await getMetaCredentialsForTenant(createdBy) : null;

      // For QR, compute the gap until the NEXT send based on how many messages
      // have already been sent in this run so far (sentSoFarCount) — NOT
      // pending.length. This way the "warm-up" gaps (first 2 messages get a
      // short 30s gap) only apply once at the very start of the run, not on
      // every 1-minute cron tick. The gap is persisted as nextQrSendAt below
      // (no in-process sleeping).
      let qrGapMs = 240000; // fallback ~4 min
      if (runProvider === 'qr') {
        const sentSoFarCount = await BroadcastRunMessage.countDocuments({
          runId: (run as any)._id,
          status: { $in: ['sent', 'delivered', 'read'] },
        });
        const gaps = calculateVariableGapsWithBreaks(sentSoFarCount + 1, {
          initialGapMs: 30000,  // 30s warmup (only applies to msg #1-2 of the whole run)
          initialGapCount: 2,
          minGapMs: 180000,     // 3 min minimum
          maxGapMs: 300000,     // 5 min maximum
          batchSize: 8,
          batchGapMs: 60000,
          totalMessagesPerHour: 15, // TARGET: 15 msgs/hour
          ensureVariation: true,
        });
        qrGapMs = gaps[gaps.length - 1];
        console.log(`[Broadcast QR] sentSoFar=${sentSoFarCount}, next gap=${Math.round(qrGapMs / 1000)}s`);
      }

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

      // Set when a QR send hits a restriction/block — the run has already
      // been paused 24h directly, so the stats-refresh block below must not
      // overwrite that with its own (much shorter) retry scheduling.
      let qrHardStopped = false;

      for (let msgIndex = 0; msgIndex < pending.length; msgIndex++) {
        const item = pending[msgIndex];
        const leadId = String((item as any).leadId || '').trim();
        const to = normalizePhone(String((item as any).phoneNumber || ''));

        if (!to || !leadId) {
          await BroadcastRunMessage.updateOne({ _id: (item as any)._id }, { $set: { status: 'skipped', failureReason: 'Missing phone/leadId', updatedAt: now } });
          stat.skipped++;
          result.skipped++;
          continue;
        }

        // Mid-batch quiet hours check — stop if we've crossed into 10:30 PM IST
        if (runProvider === 'qr') {
          const midCheck = getQrQuietHoursInfo(new Date());
          if (midCheck.isQuiet) {
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              { $set: { status: 'scheduled', scheduledAt: midCheck.resumeAt, updatedAt: new Date() } }
            );
            console.log(`[Broadcast QR] Quiet hours started mid-batch. Pausing. Resuming at ${midCheck.resumeAt.toISOString()} UTC`);
            break;
          }
        }

        // Skip duplicate phone numbers within the same run
        if (processedPhones.has(to)) {
          await BroadcastRunMessage.updateOne({ _id: (item as any)._id }, { $set: { status: 'skipped', failureReason: 'Duplicate phone in same run', updatedAt: now } });
          stat.skipped++;
          result.skipped++;
          continue;
        }
        processedPhones.add(to);

        // ── Cross-run dedup: don't re-send the SAME template to the SAME number
        // within the dedup window (default 48h, configurable via BROADCAST_DEDUP_HOURS).
        // Checked at send time (not just run-creation) so it also catches overlapping/
        // re-scheduled runs of the same template. Applies to both Meta and QR.
        const dedupHours = Number(process.env.BROADCAST_DEDUP_HOURS) || 48;
        const dedupSince = new Date(Date.now() - dedupHours * 60 * 60 * 1000);
        const recentSameTemplate = await WhatsAppMessage.findOne({
          phoneNumber: to,
          templateId: (template as any)._id,
          status: { $in: ['sent', 'delivered', 'read'] },
          sentAt: { $gte: dedupSince },
        }).select({ _id: 1 }).lean();
        if (recentSameTemplate) {
          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            { $set: { status: 'skipped', failureReason: `Same template already sent to this number within ${dedupHours}h`, updatedAt: now } }
          );
          console.log(`[Broadcast] ⏭️  Dedup skip: ${to} already got template ${(template as any)._id} within ${dedupHours}h`);
          stat.skipped++;
          result.skipped++;
          continue;
        }

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

        // Rate limit guard — use QR-specific limiter for QR broadcasts (5 AM IST reset)
        let canSend: any;
        if (runProvider === 'qr') {
          // QR uses checkRateLimit for 15/hour, 150/day with 5 AM IST reset (read-only check)
          canSend = await checkRateLimit(createdBy);
        } else {
          // Meta uses standard RateLimitManager
          canSend = await RateLimitManager.canSendMessage(createdBy, to);
        }

        if (!canSend.allowed) {
          const isDailyLimit = canSend.reason?.toLowerCase().includes('daily');
          if (isDailyLimit && runProvider === 'qr') {
            // QR daily cap hit — reschedule remaining pending messages to next 5 AM IST
            const nextReset = canSend.resetAt || new Date(now.getTime() + 24 * 60 * 60 * 1000);
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              { $set: { status: 'scheduled', scheduledAt: nextReset, updatedAt: now } }
            );
            console.log(`[Broadcast QR] Daily limit hit (${canSend.daySent}/${150}). Auto-shifted remaining messages to ${nextReset.toISOString()} (next 5 AM IST)`);
            break;
          }
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
          if (runProvider === 'qr') {
            // QR bulk quota hit — reschedule remaining to tomorrow midnight
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              { $set: { status: 'scheduled', scheduledAt: tomorrow, updatedAt: now } }
            );
            console.log(`[Broadcast QR] Bulk quota exhausted. Auto-shifted remaining messages to ${tomorrow.toDateString()}`);
            break;
          }
          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            { $set: { status: 'failed', failureReason: quotaCheck.reason || 'Daily quota exhausted', updatedAt: now } }
          );
          stat.failed++;
          result.failed++;
          console.log('[Broadcast] Daily quota exhausted, stopping run');
          break;
        }

        // Atomically CLAIM this message: flip pending -> sending only if still pending.
        // This is the concurrency guard — if two cron runs overlap, only ONE wins the
        // claim (modifiedCount === 1); the loser skips instead of sending a duplicate.
        const claim = await BroadcastRunMessage.updateOne(
          { _id: (item as any)._id, status: 'pending' },
          { $set: { status: 'sending', updatedAt: now } }
        );
        if (claim.modifiedCount === 0) {
          // Another concurrent run already claimed/sent this message — do NOT send again.
          console.log(`[Broadcast] ⏭️  Claim lost for ${to} (msg ${(item as any)._id}) — another run is handling it; skipping to avoid duplicate`);
          continue;
        }

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
          ...(metaCreds?.phoneNumber ? { senderNumber: metaCreds.phoneNumber } : {}),
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

        // Persist "sent" + reserve rate slots + schedule the next QR send.
        // Shared by the normal success path (inside the try block below) and the
        // post-timeout verification path (in the catch block) — QR bridge can
        // actually deliver despite our HTTP request timing out.
        const markMessageSent = async (apiResult: any) => {
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

          // Rate limit increment: reserve the slot now that we're actually sending
          if (runProvider === 'qr') {
            // QR: atomically reserve send slot (15/hour, 150/day with 5 AM IST reset)
            const slotReserved = await reserveSendSlot(createdBy);
            if (!slotReserved.allowed) {
              // Should not happen since we just checked, but safety guard
              console.warn(`[Broadcast QR] Rate limit reservation failed unexpectedly:`, slotReserved.reason);
              throw new Error(`Rate limit reservation failed: ${slotReserved.reason}`);
            }
            console.log(`[Broadcast QR] Rate slot reserved (day: ${slotReserved.daySent}/${150}, hour: ${slotReserved.hourSent}/${15})`);
          } else {
            // Meta: use standard rate limit manager
            const rateLimitConfig = { hourly: 1000, daily: 10000, perPhone: 5, warningThreshold: 0.8 };
            await RateLimitManager.incrementCount(createdBy, to, rateLimitConfig);
          }

          // Increment daily bulk quota
          await BulkMessageManager.incrementDailyUsage(1);

          stat.sent++;
          result.sent++;

          // ── PERSIST NEXT-SEND PACING (QR only) ─────────────────────────────
          // Never sleep in-process — the cron is invoked once per minute and
          // a long in-process sleep here previously let a single tick send
          // multiple messages (warm-up gaps were only ~30s). Instead, record
          // the earliest time the NEXT tick is allowed to send again; the
          // pacing gate at the top of this run skips ticks until then.
          if (runProvider === 'qr') {
            const gapSec = Math.round(qrGapMs / 1000);
            const isBreak = qrGapMs > 300000; // Long "phone-down" break (5+ min)
            console.log(`[Broadcast QR] ${isBreak ? '⏸️  BREAK' : '⏱️ '} Next send in ${gapSec}s (human-like pacing)`);
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              { $set: { nextQrSendAt: new Date(now.getTime() + qrGapMs), updatedAt: new Date() } }
            );
          } else if (runProvider === 'meta') {
            // Meta: 3s between messages (conservative)
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        };

        try {
          let apiResult: any;

          if (runProvider === 'qr') {
            // Send via QR Bridge — resolve per-user session headers
            const { url: bridgeUrl, secret: bridgeSecret } = getWhatsAppBridgeConfig();
            const runUserId = String((run as any).createdByUserId || '');
            // Load user's permanentTenantId so the bridge routes to the right WhatsApp session
            const userSettings = runUserId
              ? await CRMUserSettings.findOne({ userId: runUserId }, { permanentTenantId: 1, qrBridgeUrl: 1, qrConnectedPhoneNumber: 1 }).lean()
              : null;
            const sessionKey = (userSettings as any)?.permanentTenantId || runUserId;
            const connectedPhone = String((userSettings as any)?.qrConnectedPhoneNumber || '').split(':')[0].split('@')[0].replace(/\D/g, '');
            const resolvedBridgeUrl = (userSettings as any)?.qrBridgeUrl?.trim() || bridgeUrl;
            // Headers required by the bridge to route to the correct session
            const sessionHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              'x-bridge-secret': bridgeSecret,
              'x-user-id': runUserId,
              'x-session-key': sessionKey,
              'x-tenant-id': sessionKey,
            };
            
            // ── Build message text ────────────────────────────────────────────
            const headerFormat = String((template as any).headerFormat || '').toUpperCase();

            // Body text — strip [QUICK_REPLY] markers only
            const bodyText = String((template as any).templateContent || '').trim()
              .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '')
              .replace(/\[QUICK_REPLY\][^\n]*/gi, '')
              .replace(/\n{3,}/g, '\n\n')
              .trim();

            // Header text (only when headerFormat is TEXT, not IMAGE/VIDEO/DOCUMENT)
            const headerTextContent = (headerFormat === 'TEXT' && (template as any).headerContent)
              ? String((template as any).headerContent).trim()
              : '';

            const footerText = (template as any).footerText
              ? String((template as any).footerText).trim()
              : '';

            const buttons = Array.isArray((template as any).buttons) ? (template as any).buttons : [];
            const buttonTitles = buttons
              .filter((b: any) => b.title)
              .map((b: any) => String(b.title).substring(0, 20));
            const buttonTexts = buttonTitles
              .map((title: string, i: number) => `${['1️⃣', '2️⃣', '3️⃣'][i] || `${i + 1}.`} ${title}`)
              .join('\n');

            // Compose full message: TEXT header + body + footer + buttons
            const messageParts = [
              headerTextContent,
              bodyText,
              footerText,
              buttonTexts ? `📲 Reply with:\n${buttonTexts}` : '',
            ].filter(Boolean);
            const fullMessage = messageParts.join('\n\n');

            // ── Resolve media URL ─────────────────────────────────────────────
            const imageFile = (template as any).imageFile;
            const headerMedia = (template as any).headerMedia;
            let mediaUrl: string | null =
              imageFile?.url ||
              headerMedia?.url || headerMedia?.link ||
              (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat) ? String((template as any).headerContent || '') : '') ||
              null;
            if (mediaUrl === '') mediaUrl = null;

            const hasMedia = !!(mediaUrl && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat));
            const hasImage = hasMedia && (headerFormat === 'IMAGE' || !!imageFile?.url || headerMedia?.kind === 'image');
            const hasDocument = hasMedia && headerFormat === 'DOCUMENT';
            const hasVideo = hasMedia && headerFormat === 'VIDEO';

            if (hasMedia && mediaUrl) {
              mediaUrl = await getPublicMediaUrl(mediaUrl);
            }

            // Detect mimetype from URL extension
            const getMime = (url: string) => {
              const u = url.toLowerCase().split('?')[0];
              if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
              if (u.endsWith('.png')) return 'image/png';
              if (u.endsWith('.gif')) return 'image/gif';
              if (u.endsWith('.webp')) return 'image/webp';
              if (u.endsWith('.mp4')) return 'video/mp4';
              if (u.endsWith('.pdf')) return 'application/pdf';
              if (u.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              if (u.endsWith('.doc')) return 'application/msword';
              return hasImage ? 'image/jpeg' : hasVideo ? 'video/mp4' : 'application/octet-stream';
            };
            const getFileName = (url: string) => url.split('/').pop()?.split('?')[0] || 'file';

            console.log('[Broadcast QR] Sending to:', to, 'via', resolvedBridgeUrl, 'userId:', runUserId);
            console.log('[Broadcast QR] headerFormat:', headerFormat, 'hasMedia:', hasMedia, 'mediaUrl:', mediaUrl?.substring(0, 80));
            console.log('[Broadcast QR] fullMessage length:', fullMessage.length, 'preview:', fullMessage.substring(0, 60));

            // ── Send via bridge ───────────────────────────────────────────────
            let bridgeResponse: Response;

            if (hasMedia && mediaUrl) {
              // type:'media' is correct — bridge expects media/cdnUrl, NOT type:'image'/imageUrl
              const mime = getMime(mediaUrl);
              const fileName = getFileName(mediaUrl);
              const caption = bodyText + (footerText ? `\n${footerText}` : '') + (buttonTexts ? `\n\n📲 Reply with:\n${buttonTexts}` : '');
              console.log('[Broadcast QR] Sending media:', mime, fileName, 'caption length:', caption.length);
              bridgeResponse = await fetchWithTimeout(`${resolvedBridgeUrl}/send`, {
                method: 'POST',
                headers: sessionHeaders,
                body: JSON.stringify({
                  to,
                  type: 'media',
                  media: mediaUrl,
                  cdnUrl: mediaUrl,
                  mimetype: mime,
                  caption: caption || undefined,
                  fileName,
                }),
                cache: 'no-store',
              }, 60000);

              // If media send failed, fall back to sending text only
              if (!bridgeResponse.ok) {
                console.warn('[Broadcast QR] Media send failed, falling back to text-only');
                const fallbackMsg = fullMessage || `[Media: ${fileName}]\n\n${caption}`.trim();
                bridgeResponse = await fetchWithTimeout(`${resolvedBridgeUrl}/send`, {
                  method: 'POST',
                  headers: sessionHeaders,
                  body: JSON.stringify({ to, type: 'text', message: fallbackMsg }),
                  cache: 'no-store',
                }, 30000);
              }
            } else {
              // Text only (with optional native buttons)
              if (!fullMessage) {
                console.error('[Broadcast QR] Template has no content — skipping send for', to);
                await BroadcastRunMessage.updateOne(
                  { _id: (item as any)._id },
                  { $set: { status: 'skipped', failureReason: 'Template has no message content', updatedAt: now } }
                );
                stat.skipped++;
                result.skipped++;
                continue;
              }
              let bridgePayload: any = { to, type: 'text', message: fullMessage };
              if (buttonTitles.length > 0) {
                bridgePayload = { to, type: 'buttons', message: bodyText || fullMessage, buttons: buttonTitles };
              }
              bridgeResponse = await fetchWithTimeout(`${resolvedBridgeUrl}/send`, {
                method: 'POST',
                headers: sessionHeaders,
                body: JSON.stringify(bridgePayload),
                cache: 'no-store',
              }, 30000);
              // Buttons fallback to text
              if (!bridgeResponse.ok && bridgePayload.type === 'buttons') {
                console.log('[Broadcast QR] Native buttons failed, falling back to text');
                bridgeResponse = await fetchWithTimeout(`${resolvedBridgeUrl}/send`, {
                  method: 'POST',
                  headers: sessionHeaders,
                  body: JSON.stringify({ to, type: 'text', message: fullMessage }),
                  cache: 'no-store',
                }, 30000);
              }
            }
            
            if (!bridgeResponse.ok) {
              const errText = await bridgeResponse.text().catch(() => '');
              console.error('[Broadcast QR] Bridge error:', bridgeResponse.status, errText);
              throw new Error(`QR Bridge error: ${bridgeResponse.status} - ${errText}`);
            }
            
            const bridgeData = await bridgeResponse.json();
            console.log('[Broadcast QR] Bridge response:', bridgeData);

            // WhatsApp flagged/restricted this number — bridge returns HTTP 200
            // with restricted:true rather than an error status. Treat as a
            // failure so the catch block below can hard-stop this run for 24h.
            if (bridgeData?.restricted === true) {
              throw new Error(`WhatsApp account restricted/blocked: ${bridgeData?.error || bridgeData?.message || 'flagged by bridge'}`);
            }

            const waMessageId = bridgeData?.id || bridgeData?.messageId || bridgeData?.key?.id || `qr_${Date.now()}`;
            apiResult = {
              waMessageId,
              raw: { provider: 'qr' },
            };

            // Save to qr_whatsapp_messages so the stats/history page shows this send
            if (connectedPhone) {
              try {
                const QrMsg = getQrWhatsAppMessage();
                const chatJid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
                await QrMsg.updateOne(
                  { userId: runUserId, connectedPhone, messageId: waMessageId, chatJid },
                  {
                    $set: {
                      userId: runUserId,
                      connectedPhone,
                      chatJid,
                      messageId: waMessageId,
                      direction: 'outbound',
                      fromMe: true,
                      text: String((template as any).templateContent || '').trim(),
                      type: hasImage ? 'image' : 'text',
                      participant: '',
                      pushName: '',
                      timestamp: Math.floor(Date.now() / 1000),
                      status: 1,
                      hasMedia: hasImage,
                      mediaUrl: hasImage ? (mediaUrl || '') : '',
                      mediaMimetype: '',
                      mediaFileName: '',
                    },
                    $setOnInsert: { createdAt: new Date() },
                  },
                  { upsert: true }
                );
              } catch (qrSaveErr) {
                console.warn('[Broadcast QR] Warning: failed to save to qr_whatsapp_messages:', qrSaveErr instanceof Error ? qrSaveErr.message : String(qrSaveErr));
              }

              // Also upsert qr_whatsapp_chats so inbox persists when bridge restarts
              try {
                const QrChat = getQrWhatsAppChat();
                const chatJidForChat = to.includes('@') ? to : `${to}@s.whatsapp.net`;
                const msgPreview = String((template as any).templateContent || '').trim().substring(0, 100);
                await QrChat.findOneAndUpdate(
                  { userId: runUserId, connectedPhone, chatJid: chatJidForChat },
                  {
                    $set: {
                      userId: runUserId,
                      connectedPhone,
                      chatJid: chatJidForChat,
                      isGroup: false,
                      lastMessage: msgPreview,
                      lastMessageTime: new Date(),
                      lastMessageFromMe: true,
                      conversationTimestamp: Math.floor(Date.now() / 1000),
                    },
                    $setOnInsert: { name: to, pinned: false, archived: false, profilePicUrl: '', unreadCount: 0, createdAt: new Date() },
                  },
                  { upsert: true }
                );
              } catch (chatSaveErr) {
                console.warn('[Broadcast QR] Warning: failed to update qr_whatsapp_chats:', chatSaveErr instanceof Error ? chatSaveErr.message : String(chatSaveErr));
              }
            }
          } else {
            // Send via Meta Cloud API (default)
            const { buildCloudTemplateSendInput, sendWhatsAppTemplate, sendWhatsAppText } = await import('@/lib/whatsapp');

            try {
              // Merge snapshot headerMedia override into template (set at broadcast creation time)
              const snapshotMedia = (run as any).templateSnapshot?.headerMedia;
              const effectiveTemplate = snapshotMedia?.url && !(template as any).headerMedia?.url
                ? { ...(template as any), headerMedia: snapshotMedia }
                : template;

              const cloudInput = buildCloudTemplateSendInput(effectiveTemplate, to);
              console.log('[Broadcast Meta] Cloud input:', JSON.stringify(cloudInput, null, 2));
              apiResult = await sendWhatsAppTemplate(cloudInput, metaCreds || undefined);
              console.log('[Broadcast Meta] Send result:', apiResult);
            } catch (templateErr: any) {
              console.error('[Broadcast Meta] Template send failed:', templateErr?.message, templateErr?.data);
              // Don't fall back to text - throw the error
              throw templateErr;
            }
          }

          await markMessageSent(apiResult);

        } catch (err) {
          // ── QR POST-FAILURE VERIFICATION ────────────────────────────────────
          // The bridge can take longer than our HTTP timeout to download+send
          // media (Bunny CDN fetch + Baileys upload), so our request can abort
          // even though Baileys completed the send. Check session.messageMap
          // via the bridge before marking this permanently failed — this is
          // the fix for "all failed but message actually delivered".
          if (runProvider === 'qr') {
            try {
              const { url: bridgeUrl, secret: bridgeSecret } = getWhatsAppBridgeConfig();
              const runUserId = String((run as any).createdByUserId || '');
              const userSettings = runUserId
                ? await CRMUserSettings.findOne({ userId: runUserId }, { permanentTenantId: 1, qrBridgeUrl: 1 }).lean()
                : null;
              const sessionKey = (userSettings as any)?.permanentTenantId || runUserId;
              const resolvedBridgeUrl = (userSettings as any)?.qrBridgeUrl?.trim() || bridgeUrl;
              const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
              const verifyRes = await fetchWithTimeout(`${resolvedBridgeUrl}/messages/${encodeURIComponent(jid)}?limit=5`, {
                method: 'GET',
                headers: {
                  'x-bridge-secret': bridgeSecret,
                  'x-user-id': runUserId,
                  'x-session-key': sessionKey,
                  'x-tenant-id': sessionKey,
                },
                cache: 'no-store',
              }, 10000);
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json().catch(() => ({}));
                const recentSentMsg = (verifyData?.messages || []).find((m: any) =>
                  m?.fromMe && typeof m?.timestamp === 'number' && m.timestamp * 1000 >= now.getTime() - 120000
                );
                if (recentSentMsg?.id) {
                  console.log(`[Broadcast QR] Send appeared to fail (${err instanceof Error ? err.message : err}) but bridge confirms it was delivered to ${to} (id=${recentSentMsg.id}) — marking sent`);
                  await markMessageSent({ waMessageId: recentSentMsg.id, raw: { provider: 'qr', verifiedAfterTimeout: true } });
                  continue;
                }
              }
            } catch (verifyErr) {
              console.warn('[Broadcast QR] Post-failure verification check failed:', verifyErr instanceof Error ? verifyErr.message : verifyErr);
            }
          }

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
            errorCategory = 'rate_limited';
            console.warn(`[Broadcast] ⚠️ RATE LIMIT DETECTED for ${to}. Adding 30s pause.`);
            await new Promise(resolve => setTimeout(resolve, 30000));
          } else if (errorLower.includes('blocked') || errorLower.includes('opt-out') || (errorLower.includes('account') && errorLower.includes('action'))) {
            errorCategory = 'blocked';
            console.error(`[Broadcast] 🚫 ACCOUNT ACTION DETECTED. WhatsApp may be restricting this account.`);
          } else if (errorLower.includes('template') && (errorLower.includes('paused') || errorLower.includes('rejected'))) {
            errorCategory = 'template_issue';
          } else if (errorLower.includes('healthy ecosystem') || errorLower.includes('131026') || errorLower.includes('131031')) {
            errorCategory = 'meta_blocked';
          }

          // ── Auto-delete lead if Meta permanently blocked them ──
          const isMetaBlocked = errorCategory === 'meta_blocked' ||
            errorLower.includes('healthy ecosystem') ||
            errorLower.includes('131026');
          if (isMetaBlocked && (item as any).leadId) {
            try {
              const blockedLead = await Lead.findById((item as any).leadId).lean() as any;
              if (blockedLead) {
                // Soft-delete: save to deleted_leads then remove
                await DeletedLead.create({
                  leadId: blockedLead._id,
                  leadNumber: blockedLead.leadNumber,
                  assignedToUserId: blockedLead.assignedToUserId,
                  createdByUserId: blockedLead.createdByUserId,
                  deletedByUserId: 'system',
                  name: blockedLead.name,
                  phoneNumber: blockedLead.phoneNumber,
                  email: blockedLead.email,
                  workshopName: blockedLead.workshopName,
                  status: blockedLead.status,
                  labels: blockedLead.labels || [],
                  source: blockedLead.source,
                  createdAtOriginal: blockedLead.createdAt,
                  updatedAtOriginal: blockedLead.updatedAt,
                  deletedAt: new Date(),
                  deletedReason: 'meta_blocked',
                  metadata: { ...blockedLead.metadata, autoDeleteReason: 'Meta 131026: healthy ecosystem' },
                });
                await Lead.findByIdAndDelete(blockedLead._id);
                console.log(`[Broadcast] 🗑️ Auto-deleted Meta-blocked lead: ${blockedLead.phoneNumber}`);
              }
            } catch (delErr) {
              console.warn('[Broadcast] Auto-delete failed:', delErr);
            }
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

          // ── QR HARD-STOP ON RESTRICTION/BLOCK ──────────────────────────────
          // Unlike Meta, a "blocked" signal on QR means WhatsApp has flagged
          // the connected number. Retrying immediately (as the old pacing bug
          // did, for 6 hours straight) just deepens the ban. Pause this run
          // for 24h and stop processing it for this tick.
          if (runProvider === 'qr' && errorCategory === 'blocked') {
            const pauseUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              {
                $set: {
                  status: 'scheduled',
                  scheduledAt: pauseUntil,
                  nextQrSendAt: pauseUntil,
                  lastError: `WhatsApp account restricted/blocked — run auto-paused 24h to avoid deepening ban: ${errorMsg}`,
                  updatedAt: new Date(),
                },
              }
            );
            console.error(`[Broadcast QR] 🚫 Restriction detected — run ${(run as any)._id} paused 24h until ${pauseUntil.toISOString()}`);
            qrHardStopped = true;
            break;
          }

          // ── PERSIST NEXT-SEND PACING ON FAILURE TOO (QR only) ──────────────
          // Previously nextQrSendAt was only persisted on success or the
          // 'blocked' hard-stop, so a single transient failure (timeout, etc.)
          // let the next 1-minute cron tick retry immediately — collapsing the
          // 15/hr pacing into roughly one send per minute. Apply the same gap
          // here so pacing holds regardless of outcome.
          if (runProvider === 'qr') {
            await BroadcastRun.updateOne(
              { _id: (run as any)._id },
              { $set: { nextQrSendAt: new Date(now.getTime() + qrGapMs), updatedAt: new Date() } }
            );
          }

          // Continue to next message (don't stop on error)
          console.log(`[Broadcast] Continuing to next message after failure...`);
        }
      }

      // refresh run stats and maybe complete
      const counts = await markRunStats((run as any)._id);
      if (!qrHardStopped && counts.pending === 0) {
        // Don't complete yet if failed messages are still due for an 8h retry —
        // reschedule the run so the cron re-picks it when the retry window opens.
        if ((await countRetryEligible()) > 0) {
          await BroadcastRun.updateOne(
            { _id: (run as any)._id },
            { $set: { status: 'scheduled', scheduledAt: new Date(now.getTime() + RETRY_GAP_MS), updatedAt: new Date() } }
          );
        } else {
          await BroadcastRun.updateOne(
            { _id: (run as any)._id },
            { $set: { status: 'completed', completedAt: new Date(), updatedAt: new Date() } }
          );
        }
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
