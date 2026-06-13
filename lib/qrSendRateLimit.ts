/**
 * QR WhatsApp Send Rate Limiter — HARD CAPS
 *
 * Enforces:
 *   - 150 messages per day (resets at 5:00 AM IST)
 *   - 15 messages per hour (rolling clock-hour in IST)
 *
 * Counters live in MongoDB so they survive Vercel cold starts and apply across
 * the manual broadcast endpoint AND the cron processor. Once a cap is hit,
 * NO MORE messages send until the next reset — no UI override possible.
 *
 * These caps + the 5 AM–10 PM IST send window + ~1 msg/5 min pacing keep a
 * single number well under WhatsApp's spam-detection thresholds.
 *
 * NOTE: counters are stored on the existing `crm_user_settings` doc
 * (metadata.qrSendRateCounter) rather than a dedicated collection — the
 * Atlas cluster is at its 500-collection hard cap, so creating a brand-new
 * `qr_send_rate_counters` collection fails with "cannot create a new
 * collection -- already using 500 collections of 500". That failure used to
 * happen AFTER the WhatsApp send already succeeded, so every QR broadcast
 * message was wrongly marked "failed".
 */
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';

export const DAILY_LIMIT = 150;
export const HOURLY_LIMIT = 15;

/** Day key = YYYY-MM-DD in IST, with cutover at 5:00 AM (not midnight). */
function getDayKeyIST(now = new Date()): string {
  // Shift back 5h so a date "rolls over" at 5 AM IST instead of midnight
  const istMs = now.getTime() + 5.5 * 3600 * 1000; // UTC → IST
  const shifted = new Date(istMs - 5 * 3600 * 1000); // subtract 5h for 5-AM cutover
  return shifted.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Hour key = YYYY-MM-DD-HH in IST. */
function getHourKeyIST(now = new Date()): string {
  const istMs = now.getTime() + 5.5 * 3600 * 1000;
  const ist = new Date(istMs);
  return `${ist.toISOString().slice(0, 10)}-${String(ist.getUTCHours()).padStart(2, '0')}`;
}

export type RateCheckResult =
  | { allowed: true; daySent: number; hourSent: number; dayRemaining: number; hourRemaining: number }
  | { allowed: false; reason: 'daily_cap' | 'hourly_cap'; daySent: number; hourSent: number; resetAt: Date };

function getNext5AMIST(now = new Date()): Date {
  const istNow = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const reset = new Date(istNow);
  reset.setUTCHours(5, 0, 0, 0);
  if (istNow.getTime() >= reset.getTime()) reset.setUTCDate(reset.getUTCDate() + 1);
  return new Date(reset.getTime() - 5.5 * 3600 * 1000); // back to UTC
}

function getNextHour(now = new Date()): Date {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

/**
 * Check (without incrementing) whether one more send is allowed for this user.
 * Use this before queuing a broadcast — gives a clear yes/no plus current counts.
 */
export async function checkRateLimit(userId: string): Promise<RateCheckResult> {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc = await CRMUserSettings.findOne({ userId }, { 'metadata.qrSendRateCounter': 1 }).lean();
  const counter: any = (doc as any)?.metadata?.qrSendRateCounter;

  const daySent = counter?.dayKey === dayKey ? (counter?.daySent || 0) : 0;
  const hourSent = (counter?.dayKey === dayKey && counter?.hourKey === hourKey) ? (counter?.hourSent || 0) : 0;

  if (daySent >= DAILY_LIMIT) {
    return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
  }
  if (hourSent >= HOURLY_LIMIT) {
    return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
  }
  return {
    allowed: true,
    daySent,
    hourSent,
    dayRemaining: DAILY_LIMIT - daySent,
    hourRemaining: HOURLY_LIMIT - hourSent,
  };
}

/**
 * Atomically reserve ONE send slot. Returns whether the reservation succeeded
 * AND the post-reservation counts. Call this immediately before each send.
 * If it returns allowed:false, DO NOT send — the cap is hit.
 */
export async function reserveSendSlot(userId: string): Promise<RateCheckResult> {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();

  // Reset the whole counter if we rolled into a new day (5 AM IST cutover).
  try {
    await CRMUserSettings.updateOne(
      {
        userId,
        $or: [
          { 'metadata.qrSendRateCounter.dayKey': { $ne: dayKey } },
          { 'metadata.qrSendRateCounter': { $exists: false } },
          { metadata: { $exists: false } },
        ],
      },
      {
        $set: { 'metadata.qrSendRateCounter': { dayKey, daySent: 0, hourKey, hourSent: 0, lastUpdated: new Date() } },
        $setOnInsert: { userId },
      },
      { upsert: true }
    );
  } catch (err: any) {
    // E11000: another concurrent call already upserted this user's settings
    // doc (Atlas unique index on userId). The doc now exists either way, so
    // it's safe to fall through to the hour-reset and reservation steps below.
    if (err?.code !== 11000) throw err;
  }

  // Reset the hour counter if we moved to a new clock-hour (same day).
  await CRMUserSettings.updateOne(
    { userId, 'metadata.qrSendRateCounter.dayKey': dayKey, 'metadata.qrSendRateCounter.hourKey': { $ne: hourKey } },
    { $set: { 'metadata.qrSendRateCounter.hourKey': hourKey, 'metadata.qrSendRateCounter.hourSent': 0 } }
  );

  // Atomic check-and-increment: only increment if BOTH caps would still be respected.
  const updated: any = await CRMUserSettings.findOneAndUpdate(
    {
      userId,
      'metadata.qrSendRateCounter.dayKey': dayKey,
      'metadata.qrSendRateCounter.hourKey': hourKey,
      'metadata.qrSendRateCounter.daySent': { $lt: DAILY_LIMIT },
      'metadata.qrSendRateCounter.hourSent': { $lt: HOURLY_LIMIT },
    },
    {
      $inc: { 'metadata.qrSendRateCounter.daySent': 1, 'metadata.qrSendRateCounter.hourSent': 1 },
      $set: { 'metadata.qrSendRateCounter.lastUpdated': new Date() },
    },
    { new: true }
  ).lean();

  if (!updated) {
    // Reservation failed — figure out which cap blocked it
    const current: any = await CRMUserSettings.findOne({ userId }, { 'metadata.qrSendRateCounter': 1 }).lean();
    const counter = current?.metadata?.qrSendRateCounter;
    const daySent = (counter?.daySent as number) || 0;
    const hourSent = counter?.hourKey === hourKey ? ((counter?.hourSent as number) || 0) : 0;
    if (daySent >= DAILY_LIMIT) {
      return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
    }
    return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
  }

  const counter = updated.metadata.qrSendRateCounter;
  const daySent = (counter.daySent as number) || 0;
  const hourSent = (counter.hourSent as number) || 0;
  return {
    allowed: true,
    daySent,
    hourSent,
    dayRemaining: DAILY_LIMIT - daySent,
    hourRemaining: HOURLY_LIMIT - hourSent,
  };
}

/** Read current counts without mutating — for UI/status display. */
export async function getCurrentCounts(userId: string): Promise<{ daySent: number; hourSent: number; dayRemaining: number; hourRemaining: number }> {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc = await CRMUserSettings.findOne({ userId }, { 'metadata.qrSendRateCounter': 1 }).lean();
  const counter: any = (doc as any)?.metadata?.qrSendRateCounter;

  const daySent = counter?.dayKey === dayKey ? (counter?.daySent || 0) : 0;
  const hourSent = (counter?.dayKey === dayKey && counter?.hourKey === hourKey) ? (counter?.hourSent || 0) : 0;
  return {
    daySent,
    hourSent,
    dayRemaining: Math.max(0, DAILY_LIMIT - daySent),
    hourRemaining: Math.max(0, HOURLY_LIMIT - hourSent),
  };
}
