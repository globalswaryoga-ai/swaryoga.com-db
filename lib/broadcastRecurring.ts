import { connectDB } from '@/lib/db';
import {
  BroadcastRecurringSchedule,
  BroadcastRun,
  BroadcastRunMessage,
  Lead,
  WhatsAppTemplate,
  DeletedLead,
} from '@/lib/schemas/enterpriseSchemas';

/**
 * Create the BroadcastRun (+ messages) for one occurrence of a recurring
 * schedule. If the occurrence's intended send time has already passed (e.g.
 * the previous occurrence took a while to complete), anchor scheduledAt to
 * `now` instead — otherwise the run would be immediately auto-expired by
 * BROADCAST_EXPIRY_HOURS in processDueBroadcastRuns.
 */
async function createOccurrenceRun(schedule: any, leadIds: any[], occurrenceScheduledAt: Date, now: Date) {
  const template = await WhatsAppTemplate.findById(schedule.templateId).lean();
  if (!template) throw new Error('Template not found for recurring schedule');

  const leads = await Lead.find({ _id: { $in: leadIds } }).select({ _id: 1, phoneNumber: 1 }).lean();

  // Dedup by normalized phone number
  const seenPhones = new Set<string>();
  const uniqueLeads = leads.filter((l: any) => {
    const raw = String(l.phoneNumber || '').replace(/\D/g, '');
    const normalized = raw.length >= 10 ? raw.slice(-10) : raw;
    if (!normalized || seenPhones.has(normalized)) return false;
    seenPhones.add(normalized);
    return true;
  });

  // Skip Meta-blocked numbers
  const blockedDocs = await DeletedLead.find(
    { deletedReason: 'meta_blocked', phoneNumber: { $exists: true } },
    { phoneNumber: 1 }
  ).lean() as any[];
  const blockedSet = new Set(
    blockedDocs.map((d: any) => String(d.phoneNumber || '').replace(/\D/g, '').slice(-10)).filter(Boolean)
  );
  const finalLeads = uniqueLeads.filter((l: any) => {
    const norm = String(l.phoneNumber || '').replace(/\D/g, '').slice(-10);
    return !blockedSet.has(norm);
  });

  const scheduledAt = occurrenceScheduledAt.getTime() < now.getTime() ? now : occurrenceScheduledAt;

  const provider = schedule.provider || 'meta';
  const defaultInterval = provider === 'qr'
    ? { minSeconds: 120, maxSeconds: 360 } // ~15 msgs/hr, matches QR anti-ban pacing
    : { minSeconds: 1, maxSeconds: 2 };

  const run = await BroadcastRun.create({
    name: `${schedule.name} — Repeat`,
    createdByUserId: schedule.createdByUserId,
    createdByLabel: schedule.createdByUserId,
    mode: 'schedule',
    provider,
    scheduledAt,
    status: 'scheduled',
    templateId: schedule.templateId,
    messageInterval: schedule.messageInterval?.minSeconds != null ? schedule.messageInterval : defaultInterval,
    templateSnapshot: {
      templateName: (template as any).templateName,
      language: (template as any).language,
      headerFormat: (template as any).headerFormat || null,
      headerContent: (template as any).headerContent || null,
      imageFile: (template as any).imageFile || null,
      headerMedia: schedule.overrideImageUrl
        ? { kind: 'image', url: schedule.overrideImageUrl }
        : ((template as any).headerMedia || null),
      footerText: (template as any).footerText || null,
      buttons: (template as any).buttons || [],
      templateContent: (template as any).templateContent,
    },
    target: { type: 'leadIds', leadIds: finalLeads.map((l: any) => l._id) },
    stats: {
      total: finalLeads.length,
      pending: finalLeads.length,
      sent: 0,
      failed: 0,
      skipped: 0,
    },
    metadata: { recurringScheduleId: schedule._id },
  });

  if (finalLeads.length) {
    await BroadcastRunMessage.insertMany(
      finalLeads
        .filter((l: any) => String(l.phoneNumber || '').trim())
        .map((l: any) => ({
          runId: run._id,
          leadId: l._id,
          phoneNumber: String(l.phoneNumber || '').trim(),
          status: 'pending',
        }))
    );
  }

  return run;
}

export type BroadcastRecurringProcessResult = {
  scanned: number;
  processed: number;
  skipped: number;
};

/**
 * Process all active recurring broadcast schedules. For each schedule, finds
 * the next due occurrence and either:
 *  - Occurrence #1: creates a BroadcastRun targeting the schedule's leadIds.
 *  - Occurrence #2+: waits until the previous occurrence's run has finished,
 *    then creates a BroadcastRun targeting ONLY leads whose previous-occurrence
 *    message status was 'delivered' or 'read' (strict — excludes sent/failed/
 *    blocked/skipped). If none qualify, the occurrence is marked 'skipped'.
 *
 * The created BroadcastRun is then picked up and sent by the existing
 * processDueBroadcastRuns cron (/api/admin/crm/broadcast-runs/run).
 */
export async function processDueBroadcastRecurringSchedules(now: Date = new Date()): Promise<BroadcastRecurringProcessResult> {
  await connectDB();

  const schedules = await BroadcastRecurringSchedule.find({ status: 'active' });

  const result: BroadcastRecurringProcessResult = { scanned: schedules.length, processed: 0, skipped: 0 };

  for (const schedule of schedules) {
    const occurrences = (schedule as any).occurrences || [];
    const occIdx = occurrences.findIndex((o: any) => o.status === 'pending' && new Date(o.scheduledAt) <= now);

    if (occIdx === -1) {
      if (occurrences.length > 0 && occurrences.every((o: any) => o.status !== 'pending')) {
        (schedule as any).status = 'completed';
        await schedule.save();
      }
      continue;
    }

    const occ = occurrences[occIdx];

    let leadIds: any[] = [];
    if (occ.index === 0) {
      leadIds = (schedule as any).leadIds || [];
    } else {
      const prevOcc = occurrences[occIdx - 1];
      if (!prevOcc || prevOcc.status !== 'created' || !prevOcc.runId) {
        // Previous occurrence not yet created/ready — try again next tick.
        continue;
      }
      const prevRun = await BroadcastRun.findById(prevOcc.runId).select({ status: 1 }).lean();
      if (!prevRun || !['completed', 'failed', 'cancelled'].includes(String((prevRun as any).status))) {
        // Previous occurrence still sending — wait for it to finish before
        // computing the delivered/read filter.
        continue;
      }
      const delivered = await BroadcastRunMessage.find({
        runId: prevOcc.runId,
        status: { $in: ['delivered', 'read'] },
      }).select({ leadId: 1 }).lean();
      leadIds = delivered.map((d: any) => d.leadId);
    }

    if (leadIds.length === 0) {
      occ.status = 'skipped';
      occ.recipientCount = 0;
      occ.note = occ.index === 0
        ? 'No recipients configured'
        : 'No delivered/read recipients from the previous occurrence';
      (schedule as any).lastProcessedAt = now;
      await schedule.save();
      result.skipped++;
      continue;
    }

    const run = await createOccurrenceRun(schedule, leadIds, new Date(occ.scheduledAt), now);
    occ.status = 'created';
    occ.runId = run._id;
    occ.recipientCount = leadIds.length;
    (schedule as any).lastProcessedAt = now;
    await schedule.save();
    result.processed++;
  }

  return result;
}
