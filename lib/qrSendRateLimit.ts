/**
 * QR WhatsApp Send Rate Limiter — HARD CAPS
 *
 * Enforces:
 *   - 200 messages per day (resets at 5:00 AM IST)
 *   - 20 messages per hour (rolling clock-hour in IST)
 *
 * Counters live in MongoDB so they survive Vercel cold starts and apply across
 * the manual broadcast endpoint AND the cron processor. Once a cap is hit,
 * NO MORE messages send until the next reset — no UI override possible.
 */
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

export const DAILY_LIMIT = 200;
export const HOURLY_LIMIT = 20;

const COLLECTION = 'qr_send_rate_counters';

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
  const db = mongoose.connection.db!;
  const col = db.collection(COLLECTION);

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc = await col.findOne({ userId, dayKey });

  const daySent = (doc?.daySent as number) || 0;
  const hourSent = doc?.hourKey === hourKey ? ((doc?.hourSent as number) || 0) : 0;

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
  const db = mongoose.connection.db!;
  const col = db.collection(COLLECTION);

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();

  // First make sure the doc for today exists, and that hourKey is current
  await col.updateOne(
    { userId, dayKey },
    {
      $setOnInsert: { userId, dayKey, daySent: 0, createdAt: new Date() },
      $set: { lastUpdated: new Date() },
    },
    { upsert: true }
  );
  // Reset hour counter if we moved to a new hour
  await col.updateOne(
    { userId, dayKey, hourKey: { $ne: hourKey } },
    { $set: { hourKey, hourSent: 0 } }
  );

  // Atomic check-and-increment: only increment if BOTH caps would still be respected.
  // Returns the document AFTER the update; null/undefined means no doc matched (cap hit).
  const updated = await col.findOneAndUpdate(
    {
      userId,
      dayKey,
      daySent: { $lt: DAILY_LIMIT },
      hourSent: { $lt: HOURLY_LIMIT },
    },
    {
      $inc: { daySent: 1, hourSent: 1 },
      $set: { hourKey, lastUpdated: new Date() },
    },
    { returnDocument: 'after' }
  ) as any;

  // Driver-version compat: some return { value: doc }, others return doc directly
  const doc: any = updated?.value ?? updated;

  if (!doc) {
    // Reservation failed — figure out which cap blocked it
    const current = await col.findOne({ userId, dayKey });
    const daySent = (current?.daySent as number) || 0;
    const hourSent = current?.hourKey === hourKey ? ((current?.hourSent as number) || 0) : 0;
    if (daySent >= DAILY_LIMIT) {
      return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
    }
    return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
  }

  const daySent = (doc.daySent as number) || 0;
  const hourSent = (doc.hourSent as number) || 0;
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
  const db = mongoose.connection.db!;
  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc = await db.collection(COLLECTION).findOne({ userId, dayKey });
  const daySent = (doc?.daySent as number) || 0;
  const hourSent = doc?.hourKey === hourKey ? ((doc?.hourSent as number) || 0) : 0;
  return {
    daySent,
    hourSent,
    dayRemaining: Math.max(0, DAILY_LIMIT - daySent),
    hourRemaining: Math.max(0, HOURLY_LIMIT - hourSent),
  };
}
