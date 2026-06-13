import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import {
  CRMUserSettings,
  BroadcastRun,
  BroadcastRunMessage,
  Lead,
  WhatsAppTemplate,
  DeletedLead,
} from '@/lib/schemas/enterpriseSchemas';

// Recurring/repeat broadcast schedules are stored as an embedded array on
// CRMUserSettings.metadata.broadcastRecurringSchedules (one array per admin
// user), NOT in a dedicated collection — the Atlas cluster is pinned at its
// 500-collection hard cap, so creating a brand-new collection fails (same
// constraint as lib/qrSendRateLimit.ts).

export type RecurringOccurrence = {
  index: number;
  scheduledAt: Date;
  runId?: mongoose.Types.ObjectId;
  status: 'pending' | 'created' | 'skipped';
  recipientCount?: number;
  note?: string;
};

export type RecurringSchedule = {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdByUserId: string;
  templateId: mongoose.Types.ObjectId;
  provider: 'meta' | 'qr';
  leadIds: mongoose.Types.ObjectId[];
  sendTime: string;
  deliveredOnly: boolean;
  overrideImageUrl?: string;
  messageInterval?: { minSeconds: number; maxSeconds: number };
  occurrences: RecurringOccurrence[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  lastProcessedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create a new recurring broadcast schedule for the given user and persist
 * it onto their CRMUserSettings doc (upserted if it doesn't exist yet).
 */
export async function createRecurringSchedule(params: {
  userId: string;
  name: string;
  templateId: string;
  provider: 'meta' | 'qr';
  leadIds: string[];
  sendTime: string;
  occurrenceDates: Date[];
  overrideImageUrl?: string;
}): Promise<RecurringSchedule> {
  await connectDB();

  const now = new Date();
  const schedule: RecurringSchedule = {
    _id: new mongoose.Types.ObjectId(),
    name: params.name,
    createdByUserId: params.userId,
    templateId: new mongoose.Types.ObjectId(params.templateId),
    provider: params.provider,
    leadIds: params.leadIds.map((id) => new mongoose.Types.ObjectId(id)),
    sendTime: params.sendTime,
    deliveredOnly: true,
    overrideImageUrl: params.overrideImageUrl || undefined,
    occurrences: params.occurrenceDates.map((scheduledAt, index) => ({
      index,
      scheduledAt,
      status: 'pending',
    })),
    status: 'active',
    lastProcessedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await CRMUserSettings.updateOne(
    { userId: params.userId },
    {
      $push: { 'metadata.broadcastRecurringSchedules': schedule },
      $setOnInsert: { userId: params.userId },
    },
    { upsert: true }
  );

  return schedule;
}

/**
 * List recurring schedules across one or more users (flattened, with
 * createdByUserId attached), most recent first.
 */
export async function listRecurringSchedules(filter: { userIds?: string[]; status?: string } = {}): Promise<RecurringSchedule[]> {
  await connectDB();

  const query: any = {};
  if (filter.userIds && filter.userIds.length) query.userId = { $in: filter.userIds };

  const users = await CRMUserSettings.find(query, { userId: 1, 'metadata.broadcastRecurringSchedules': 1 }).lean();

  const schedules: RecurringSchedule[] = [];
  for (const u of users as any[]) {
    for (const s of (u.metadata?.broadcastRecurringSchedules || [])) {
      if (filter.status && s.status !== filter.status) continue;
      schedules.push({ ...s, createdByUserId: u.userId });
    }
  }

  schedules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return schedules;
}

/**
 * Find which user owns a given recurring schedule (by its embedded _id).
 * Optionally restrict the search to a specific userId (tenant scoping).
 * Returns null if not found / not owned by the given userId.
 */
export async function findRecurringScheduleOwner(scheduleId: string, userId?: string): Promise<string | null> {
  await connectDB();
  const query: any = { 'metadata.broadcastRecurringSchedules._id': new mongoose.Types.ObjectId(scheduleId) };
  if (userId) query.userId = userId;
  const doc = await CRMUserSettings.findOne(query, { userId: 1 }).lean();
  return (doc as any)?.userId || null;
}

/**
 * Update editable fields (name, sendTime, status) on a recurring schedule.
 * When sendTime changes, all PENDING occurrences are rescheduled to the new
 * time-of-day while keeping their original calendar date (IST).
 */
export async function updateRecurringSchedule(
  userId: string,
  scheduleId: string,
  updates: { name?: string; sendTime?: string; status?: 'active' | 'paused' }
): Promise<void> {
  await connectDB();
  const now = new Date();
  const objId = new mongoose.Types.ObjectId(scheduleId);

  const set: Record<string, unknown> = { 'metadata.broadcastRecurringSchedules.$[s].updatedAt': now };
  if (updates.name !== undefined) set['metadata.broadcastRecurringSchedules.$[s].name'] = updates.name;
  if (updates.sendTime !== undefined) set['metadata.broadcastRecurringSchedules.$[s].sendTime'] = updates.sendTime;
  if (updates.status !== undefined) set['metadata.broadcastRecurringSchedules.$[s].status'] = updates.status;

  await CRMUserSettings.updateOne(
    { userId },
    { $set: set },
    { arrayFilters: [{ 's._id': objId }] }
  );

  if (updates.sendTime !== undefined) {
    const doc = await CRMUserSettings.findOne(
      { userId, 'metadata.broadcastRecurringSchedules._id': objId },
      { 'metadata.broadcastRecurringSchedules': 1 }
    ).lean();
    const schedule = (doc as any)?.metadata?.broadcastRecurringSchedules?.find(
      (s: any) => String(s._id) === scheduleId
    );
    const [hh, mm] = updates.sendTime.split(':');
    for (const occ of schedule?.occurrences || []) {
      if (occ.status !== 'pending') continue;
      const istDateStr = new Date(occ.scheduledAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const newScheduledAt = new Date(`${istDateStr}T${hh}:${mm}:00+05:30`);
      await CRMUserSettings.updateOne(
        { userId },
        { $set: { 'metadata.broadcastRecurringSchedules.$[s].occurrences.$[o].scheduledAt': newScheduledAt } },
        { arrayFilters: [{ 's._id': objId }, { 'o.index': occ.index }] }
      );
    }
  }
}

/**
 * Permanently remove a recurring schedule from the user's settings doc.
 */
export async function deleteRecurringSchedule(userId: string, scheduleId: string): Promise<void> {
  await connectDB();
  await CRMUserSettings.updateOne(
    { userId },
    { $pull: { 'metadata.broadcastRecurringSchedules': { _id: new mongoose.Types.ObjectId(scheduleId) } } }
  );
}

async function setScheduleStatus(userId: string, scheduleId: mongoose.Types.ObjectId, status: RecurringSchedule['status'], now: Date) {
  await CRMUserSettings.updateOne(
    { userId },
    {
      $set: {
        'metadata.broadcastRecurringSchedules.$[s].status': status,
        'metadata.broadcastRecurringSchedules.$[s].lastProcessedAt': now,
        'metadata.broadcastRecurringSchedules.$[s].updatedAt': now,
      },
    },
    { arrayFilters: [{ 's._id': scheduleId }] }
  );
}

async function setOccurrenceFields(
  userId: string,
  scheduleId: mongoose.Types.ObjectId,
  occIndex: number,
  fields: Record<string, unknown>,
  now: Date
) {
  const set: Record<string, unknown> = {
    'metadata.broadcastRecurringSchedules.$[s].lastProcessedAt': now,
    'metadata.broadcastRecurringSchedules.$[s].updatedAt': now,
  };
  for (const [k, v] of Object.entries(fields)) {
    set[`metadata.broadcastRecurringSchedules.$[s].occurrences.$[o].${k}`] = v;
  }
  await CRMUserSettings.updateOne(
    { userId },
    { $set: set },
    { arrayFilters: [{ 's._id': scheduleId }, { 'o.index': occIndex }] }
  );
}

/**
 * Create the BroadcastRun (+ messages) for one occurrence of a recurring
 * schedule. If the occurrence's intended send time has already passed (e.g.
 * the previous occurrence took a while to complete), anchor scheduledAt to
 * `now` instead — otherwise the run would be immediately auto-expired by
 * BROADCAST_EXPIRY_HOURS in processDueBroadcastRuns.
 */
async function createOccurrenceRun(schedule: RecurringSchedule, leadIds: any[], occurrenceScheduledAt: Date, now: Date) {
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

  const users = await CRMUserSettings.find(
    { 'metadata.broadcastRecurringSchedules.status': 'active' },
    { userId: 1, 'metadata.broadcastRecurringSchedules': 1 }
  ).lean();

  const result: BroadcastRecurringProcessResult = { scanned: 0, processed: 0, skipped: 0 };

  for (const userDoc of users as any[]) {
    const userId = userDoc.userId;
    const schedules: RecurringSchedule[] = (userDoc.metadata?.broadcastRecurringSchedules || [])
      .filter((s: any) => s.status === 'active');

    for (const schedule of schedules) {
      result.scanned++;

      const occurrences = schedule.occurrences || [];
      const occIdx = occurrences.findIndex((o) => o.status === 'pending' && new Date(o.scheduledAt) <= now);

      if (occIdx === -1) {
        if (occurrences.length > 0 && occurrences.every((o) => o.status !== 'pending')) {
          await setScheduleStatus(userId, schedule._id, 'completed', now);
        }
        continue;
      }

      const occ = occurrences[occIdx];

      let leadIds: any[] = [];
      if (occ.index === 0) {
        leadIds = schedule.leadIds || [];
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
        await setOccurrenceFields(userId, schedule._id, occ.index, {
          status: 'skipped',
          recipientCount: 0,
          note: occ.index === 0
            ? 'No recipients configured'
            : 'No delivered/read recipients from the previous occurrence',
        }, now);
        result.skipped++;
        continue;
      }

      const run = await createOccurrenceRun(schedule, leadIds, new Date(occ.scheduledAt), now);
      await setOccurrenceFields(userId, schedule._id, occ.index, {
        status: 'created',
        runId: run._id,
        recipientCount: leadIds.length,
      }, now);
      result.processed++;
    }
  }

  return result;
}
