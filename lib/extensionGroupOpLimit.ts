/**
 * Browser Extension Group-Operation Rate Limiter — HARD CAPS, PER CRM USER
 *
 * Same model/limits as lib/qrGroupOpRateLimit.ts (15/hour, 150/day, resets
 * 5:00 AM IST), but a SEPARATE counter and SEPARATE budget — the extension
 * runs on each user's own PERSONAL WhatsApp number, not the shared QR-bridge
 * number, so it must not share (or drain) that number's budget. Keyed
 * directly by userId (each person's personal WhatsApp is inherently theirs
 * alone — no shared-number complexity like the QR bridge has).
 *
 * Applies to: group participant add/remove, group creation, and
 * group-targeted scheduled sends — NOT 1:1 messages, which stay unlimited
 * and available 24 hours (see extensionTimeGuard.ts).
 */
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';

export const EXT_GROUP_OP_DAILY_LIMIT = 150;
export const EXT_GROUP_OP_HOURLY_LIMIT = 15;

function getDayKeyIST(now = new Date()): string {
  const istMs = now.getTime() + 5.5 * 3600 * 1000;
  const shifted = new Date(istMs - 5 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function getHourKeyIST(now = new Date()): string {
  const istMs = now.getTime() + 5.5 * 3600 * 1000;
  const ist = new Date(istMs);
  return `${ist.toISOString().slice(0, 10)}-${String(ist.getUTCHours()).padStart(2, '0')}`;
}

function getNext5AMIST(now = new Date()): Date {
  const istNow = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const reset = new Date(istNow);
  reset.setUTCHours(5, 0, 0, 0);
  if (istNow.getTime() >= reset.getTime()) reset.setUTCDate(reset.getUTCDate() + 1);
  return new Date(reset.getTime() - 5.5 * 3600 * 1000);
}

function getNextHour(now = new Date()): Date {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export type ExtGroupOpCheck =
  | { allowed: true; daySent: number; hourSent: number; dayRemaining: number; hourRemaining: number }
  | { allowed: false; reason: 'daily_cap' | 'hourly_cap'; daySent: number; hourSent: number; resetAt: Date };

/**
 * Atomically reserve ONE group-op slot for this user. Call immediately
 * before each member add/remove/group-create/group-scheduled-send. If it
 * returns allowed:false, DO NOT perform the op — the cap is hit.
 */
export async function reserveExtensionGroupOpSlot(userId: string): Promise<ExtGroupOpCheck> {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const filter = { userId };
  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();

  try {
    await CRMUserSettings.updateOne(
      {
        ...filter,
        $or: [
          { 'metadata.extensionGroupOpRateCounter.dayKey': { $ne: dayKey } },
          { 'metadata.extensionGroupOpRateCounter': { $exists: false } },
          { metadata: { $exists: false } },
        ],
      },
      {
        $set: { 'metadata.extensionGroupOpRateCounter': { dayKey, daySent: 0, hourKey, hourSent: 0, lastUpdated: new Date() } },
        $setOnInsert: { userId },
      },
      { upsert: true }
    );
  } catch (err: any) {
    if (err?.code !== 11000) throw err;
  }

  await CRMUserSettings.updateOne(
    { ...filter, 'metadata.extensionGroupOpRateCounter.dayKey': dayKey, 'metadata.extensionGroupOpRateCounter.hourKey': { $ne: hourKey } },
    { $set: { 'metadata.extensionGroupOpRateCounter.hourKey': hourKey, 'metadata.extensionGroupOpRateCounter.hourSent': 0 } }
  );

  const updated: any = await CRMUserSettings.findOneAndUpdate(
    {
      ...filter,
      'metadata.extensionGroupOpRateCounter.dayKey': dayKey,
      'metadata.extensionGroupOpRateCounter.hourKey': hourKey,
      'metadata.extensionGroupOpRateCounter.daySent': { $lt: EXT_GROUP_OP_DAILY_LIMIT },
      'metadata.extensionGroupOpRateCounter.hourSent': { $lt: EXT_GROUP_OP_HOURLY_LIMIT },
    },
    {
      $inc: { 'metadata.extensionGroupOpRateCounter.daySent': 1, 'metadata.extensionGroupOpRateCounter.hourSent': 1 },
      $set: { 'metadata.extensionGroupOpRateCounter.lastUpdated': new Date() },
    },
    { new: true }
  ).lean();

  if (!updated) {
    const current: any = await CRMUserSettings.findOne(filter, { 'metadata.extensionGroupOpRateCounter': 1 }).lean();
    const counter = current?.metadata?.extensionGroupOpRateCounter;
    const daySent = (counter?.daySent as number) || 0;
    const hourSent = counter?.hourKey === hourKey ? ((counter?.hourSent as number) || 0) : 0;
    if (daySent >= EXT_GROUP_OP_DAILY_LIMIT) {
      return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
    }
    return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
  }

  const counter = updated.metadata.extensionGroupOpRateCounter;
  const daySent = (counter.daySent as number) || 0;
  const hourSent = (counter.hourSent as number) || 0;
  return {
    allowed: true,
    daySent,
    hourSent,
    dayRemaining: EXT_GROUP_OP_DAILY_LIMIT - daySent,
    hourRemaining: EXT_GROUP_OP_HOURLY_LIMIT - hourSent,
  };
}
