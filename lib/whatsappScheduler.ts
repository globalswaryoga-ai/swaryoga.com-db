import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { RateLimitManager } from '@/lib/rateLimitManager';
import { Lead, WhatsAppMessage, WhatsAppScheduledJob, WhatsAppTemplate, getQrWhatsAppMessage, getQrWhatsAppChat } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText, sendWhatsAppTemplate, buildCloudTemplateSendInput } from '@/lib/whatsapp';
import { isQrTenantConnected, resolveQrTenantBridge, sendQrTenantMessage } from '@/lib/qrTenantBridge';

export type SchedulerRunResult = {
  scannedJobs: number;
  executedJobs: number;
  sentMessages: number;
  queuedMessages: number;
  failedMessages: number;
  jobResults: Array<{
    jobId: string;
    status: 'ok' | 'error';
    attempted: number;
    sent: number;
    queued: number;
    failed: number;
    error?: string;
  }>;
};

function toNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeNextRunAt(job: any, from: Date): Date | null {
  const recurrence = job?.recurrence || {};
  const frequency = String(recurrence?.frequency || 'none');
  const interval = Math.max(1, toNumber(recurrence?.interval, 1));

  if (frequency === 'none') return null;

  const base = new Date(from);

  if (frequency === 'custom') {
    const minutes = Math.max(1, toNumber(recurrence?.customMinutes, 0));
    if (!minutes) return null;
    return new Date(base.getTime() + minutes * 60 * 1000);
  }

  if (frequency === 'daily') {
    return new Date(base.getTime() + interval * 24 * 60 * 60 * 1000);
  }

  if (frequency === 'weekly') {
    // If weekdays specified, find the next matching weekday.
    const weekdays: number[] = Array.isArray(recurrence?.weekdays) ? recurrence.weekdays : [];
    if (weekdays.length > 0) {
      const set = new Set(weekdays.map((d) => (Number(d) + 7) % 7));
      for (let i = 1; i <= 14 * interval; i++) {
        const candidate = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
        if (set.has(candidate.getDay())) return candidate;
      }
      // Fallback
      return new Date(base.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    }
    return new Date(base.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
  }

  if (frequency === 'monthly') {
    const d = new Date(base);
    d.setMonth(d.getMonth() + interval);
    return d;
  }

  if (frequency === 'yearly') {
    const d = new Date(base);
    d.setFullYear(d.getFullYear() + interval);
    return d;
  }

  return null;
}

async function resolveLeadsForJob(job: any, hardLimit: number): Promise<any[]> {
  const targetType = String(job?.targetType || 'leadIds');

  if (targetType === 'phone') {
    const phone = normalizePhone(String(job?.targetPhone || ''));
    return phone ? [{ phoneNumber: phone }] : [];
  }

  if (targetType === 'leadIds') {
    const ids = Array.isArray(job?.targetLeadIds) ? job.targetLeadIds : [];
    if (ids.length === 0) return [];

    return await Lead.find({ _id: { $in: ids } })
      .limit(Math.min(ids.length, hardLimit))
      .lean();
  }

  const filterRaw = job?.targetFilter || {};
  const filter: any = {};

  if (Array.isArray(filterRaw?.statuses) && filterRaw.statuses.length > 0) {
    filter.status = { $in: filterRaw.statuses };
  }
  if (typeof filterRaw?.workshopName === 'string' && filterRaw.workshopName.trim()) {
    filter.workshopName = String(filterRaw.workshopName).trim();
  }
  if (typeof filterRaw?.assignedToUserId === 'string' && filterRaw.assignedToUserId.trim()) {
    filter.assignedToUserId = String(filterRaw.assignedToUserId).trim();
  }
  if (typeof filterRaw?.createdByUserId === 'string' && filterRaw.createdByUserId.trim()) {
    filter.createdByUserId = String(filterRaw.createdByUserId).trim();
  }
  if (Array.isArray(filterRaw?.labelsAny) && filterRaw.labelsAny.length > 0) {
    filter.labels = { $in: filterRaw.labelsAny };
  }
  if (Array.isArray(filterRaw?.labelsAll) && filterRaw.labelsAll.length > 0) {
    // Mongo requires $all for "must have all"
    filter.labels = { ...(filter.labels || {}), $all: filterRaw.labelsAll };
  }

  return await Lead.find(filter).limit(hardLimit).lean();
}

export async function runDueWhatsAppScheduledJobs(options?: {
  now?: Date;
  jobLimit?: number;
  leadsPerJobLimit?: number;
}): Promise<SchedulerRunResult> {
  await connectDB();

  const now = options?.now || new Date();
  const jobLimit = Math.min(Math.max(1, options?.jobLimit ?? 100), 200);
  const leadsPerJobLimit = Math.min(Math.max(1, options?.leadsPerJobLimit ?? 200), 2000);

  const dueJobs = await WhatsAppScheduledJob.find({
    status: 'active',
    nextRunAt: { $lte: now },
  })
    .sort({ nextRunAt: 1 })
    .limit(jobLimit)
    .lean();

  const result: SchedulerRunResult = {
    scannedJobs: dueJobs.length,
    executedJobs: 0,
    sentMessages: 0,
    queuedMessages: 0,
    failedMessages: 0,
    jobResults: [],
  };

  const concurrency = 20;
  const qrJobs = dueJobs.filter((job: any) => String(job.provider || 'meta') === 'qr');
  const metaJobs = dueJobs.filter((job: any) => String(job.provider || 'meta') !== 'qr');
  const jobBatches: any[][] = [];
  for (let offset = 0; offset < qrJobs.length; offset += concurrency) jobBatches.push(qrJobs.slice(offset, offset + concurrency));
  // The Meta channel is shared, so preserve its historical sequential behavior.
  for (const metaJob of metaJobs) jobBatches.push([metaJob]);
  for (const batch of jobBatches) {
    await Promise.all(batch.map(async (job) => {
    const jobId = String(job._id);
    const jobStat: SchedulerRunResult['jobResults'][number] = {
      jobId,
      status: 'ok',
      attempted: 0,
      sent: 0,
      queued: 0,
      failed: 0,
      error: undefined as string | undefined,
    };

    try {
      // Atomic per-job lease prevents duplicate sends when cron invocations overlap.
      const leaseUntil = new Date(Date.now() + 5 * 60 * 1000);
      const claim = await WhatsAppScheduledJob.updateOne(
        {
          _id: job._id,
          status: 'active',
          nextRunAt: { $lte: now },
          $or: [
            { 'metadata.executionLockUntil': { $exists: false } },
            { 'metadata.executionLockUntil': { $lte: now } },
          ],
        },
        { $set: { 'metadata.executionLockUntil': leaseUntil, 'metadata.executionStartedAt': now } }
      );
      // This job is running inside an async map callback, not the enclosing
      // batch loop. Another worker already owns the lease, so finish this
      // callback without attempting a duplicate send.
      if (!claim.modifiedCount) return;

      const leads = await resolveLeadsForJob(job, leadsPerJobLimit);

      const messageType = String(job.messageType || 'text');
      let rawContent = String(job.messageContent || '').trim();
      const provider = String(job.provider || 'meta');
      const qrSession = provider === 'qr'
        ? await resolveQrTenantBridge(String(job.createdByUserId || ''), String(job.qrSessionKey || ''))
        : null;
      if (provider === 'qr' && (!qrSession || !(await isQrTenantConnected(qrSession)))) {
        throw new Error('QR WhatsApp session is disconnected');
      }

      let qrTemplate: any = null;
      if (provider === 'qr' && messageType === 'template' && job.templateId) {
        qrTemplate = await WhatsAppTemplate.findById(job.templateId).lean();
        if (!qrTemplate) throw new Error(`Template not found: ${job.templateId}`);
        rawContent = rawContent || String(qrTemplate.templateContent || '').trim();
      }

      for (const lead of leads) {
        const leadId = String((lead as any)._id || '');
        const to = normalizePhone(String((lead as any).phoneNumber || ''));
        if (!to) continue;

        // Consent / opt-out compliance
        const compliance = await ConsentManager.validateCompliance(to);
        if (!compliance.compliant) {
          continue;
        }

        const createdByUserId = String(job.createdByUserId || 'system');

        // Rate limit guard (best effort). If userId is not a real ObjectId, RateLimitManager still uses it as key.
        const canSend = await RateLimitManager.canSendMessage(createdByUserId, to);
        if (!canSend.allowed) {
          // Record as failed without calling WhatsApp API
          await WhatsAppMessage.create({
            ...(leadId ? { leadId } : {}),
            phoneNumber: to,
            direction: 'outbound',
            messageType,
            messageContent: rawContent,
            status: 'failed',
            failureReason: canSend.reason || 'Rate limit reached',
            sentByLabel: createdByUserId,
            sentAt: now,
            metadata: { scheduler: { jobId } },
          });
          jobStat.attempted++;
          jobStat.failed++;
          continue;
        }

        // Create message record
        const message = await WhatsAppMessage.create({
          ...(leadId ? { leadId } : {}),
          phoneNumber: to,
          direction: 'outbound',
          messageType,
          messageContent: rawContent,
          status: 'queued',
          sentByLabel: createdByUserId,
          sentAt: now,
          retryCount: 0,
          metadata: { scheduler: { jobId }, ...(qrSession ? { sessionKey: qrSession.sessionKey, tenantId: qrSession.tenantId } : {}) },
          provider: provider === 'qr' ? 'whatsapp_web_bridge' : 'meta',
          senderNumber: qrSession?.connectedPhone || undefined,
        });

        jobStat.attempted++;

        // Execute immediate send for text; others stay queued
        if (provider === 'qr' && qrSession && (messageType === 'text' || messageType === 'template')) {
          try {
            const mediaUrl = String(qrTemplate?.imageFile?.url || qrTemplate?.headerMedia?.url || '');
            const payload = mediaUrl
              ? { to, type: 'media', media: mediaUrl, mimetype: qrTemplate?.imageFile?.mimeType || qrTemplate?.headerMedia?.mimeType || 'image/jpeg', caption: rawContent }
              : { to, type: 'text', message: rawContent };
            const apiResult = await sendQrTenantMessage(qrSession, payload);
            const waMessageId = apiResult.waMessageId || `scheduled-${jobId}-${to}-${Date.now()}`;
            await WhatsAppMessage.updateOne(
              { _id: message._id },
              { $set: { status: 'sent', waMessageId, updatedAt: new Date() }, $unset: { failureReason: 1, nextRetryAt: 1 } }
            );

            if (qrSession.connectedPhone) {
              const chatJid = `${to}@s.whatsapp.net`;
              const timestamp = Math.floor(Date.now() / 1000);
              await getQrWhatsAppMessage().updateOne(
                { userId: qrSession.userId, connectedPhone: qrSession.connectedPhone, chatJid, messageId: waMessageId },
                { $set: { userId: qrSession.userId, connectedPhone: qrSession.connectedPhone, chatJid, messageId: waMessageId, direction: 'outbound', fromMe: true, text: rawContent, type: mediaUrl ? 'image' : 'text', timestamp, status: 1, hasMedia: !!mediaUrl, mediaUrl, metadata: { sessionKey: qrSession.sessionKey, tenantId: qrSession.tenantId, scheduledJobId: jobId } }, $setOnInsert: { createdAt: new Date() } },
                { upsert: true }
              );
              await getQrWhatsAppChat().updateOne(
                { userId: qrSession.userId, connectedPhone: qrSession.connectedPhone, chatJid },
                { $set: { userId: qrSession.userId, connectedPhone: qrSession.connectedPhone, chatJid, lastMessage: rawContent, lastMessageTime: new Date(), lastMessageFromMe: true, conversationTimestamp: timestamp }, $setOnInsert: { name: to, isGroup: false, unreadCount: 0, pinned: false, archived: false, profilePicUrl: '', createdAt: new Date() } },
                { upsert: true }
              );
            }
            await RateLimitManager.incrementCount(createdByUserId, to);
            jobStat.sent++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'QR WhatsApp send failed';
            await WhatsAppMessage.updateOne({ _id: message._id }, { $set: { status: 'failed', failureReason: msg, updatedAt: new Date() } });
            jobStat.failed++;
          }
        } else if (messageType === 'text') {
          try {
            const apiResult = await sendWhatsAppText(to, rawContent);
            await WhatsAppMessage.updateOne(
              { _id: message._id },
              {
                $set: {
                  status: 'sent',
                  waMessageId: apiResult.waMessageId,
                  updatedAt: new Date(),
                },
                $unset: { failureReason: 1, nextRetryAt: 1 },
              }
            );

            await RateLimitManager.incrementCount(createdByUserId, to);

            jobStat.sent++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'WhatsApp send failed';
            await WhatsAppMessage.updateOne(
              { _id: message._id },
              {
                $set: { status: 'failed', failureReason: String(msg), updatedAt: new Date() },
              }
            );
            jobStat.failed++;
          }
        } else if (messageType === 'template' && job.templateId) {
          // Handle template messages
          try {
            const template = await WhatsAppTemplate.findById(job.templateId).lean();
            if (!template) {
              throw new Error(`Template not found: ${job.templateId}`);
            }
            
            const cloudInput = buildCloudTemplateSendInput(template, to);
            const apiResult = await sendWhatsAppTemplate(cloudInput);
            
            await WhatsAppMessage.updateOne(
              { _id: message._id },
              {
                $set: {
                  status: 'sent',
                  waMessageId: apiResult.waMessageId,
                  templateId: job.templateId,
                  messageType: 'template',
                  updatedAt: new Date(),
                  'metadata.template': {
                    templateName: (template as any).templateName,
                    headerFormat: (template as any).headerFormat,
                  },
                },
                $unset: { failureReason: 1, nextRetryAt: 1 },
              }
            );

            await RateLimitManager.incrementCount(createdByUserId, to);

            jobStat.sent++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Template send failed';
            await WhatsAppMessage.updateOne(
              { _id: message._id },
              {
                $set: { status: 'failed', failureReason: String(msg), updatedAt: new Date() },
              }
            );
            jobStat.failed++;
          }
        } else {
          jobStat.queued++;
        }
      }

      // Update job schedule
      const runCount = toNumber(job.runCount, 0) + 1;
      const maxRuns = toNumber(job.maxRuns, 0);
      let nextRunAt = computeNextRunAt(job, now);
      if (nextRunAt && job.endAt && nextRunAt > new Date(job.endAt)) nextRunAt = null;

      const update: any = {
        lastRunAt: now,
        runCount,
        lastError: undefined,
        updatedAt: now,
      };

      if (!nextRunAt || (maxRuns > 0 && runCount >= maxRuns)) {
        update.status = 'completed';
        update.nextRunAt = undefined;
      } else {
        update.nextRunAt = nextRunAt;
      }

      await WhatsAppScheduledJob.updateOne(
        { _id: job._id },
        { $set: update, $unset: { lastError: 1, 'metadata.executionLockUntil': 1, 'metadata.executionStartedAt': 1 } }
      );

      result.executedJobs++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scheduler error';
      jobStat.status = 'error';
      jobStat.error = String(msg);
      await WhatsAppScheduledJob.updateOne(
        { _id: job._id },
        {
          $set: {
            lastError: String(msg),
            updatedAt: new Date(),
          },
          $unset: { 'metadata.executionLockUntil': 1, 'metadata.executionStartedAt': 1 },
        }
      );
    }

    result.sentMessages += jobStat.sent;
    result.queuedMessages += jobStat.queued;
    result.failedMessages += jobStat.failed;
    result.jobResults.push(jobStat);
    }));
  }

  return result;
}
