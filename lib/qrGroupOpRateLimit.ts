/**
 * QR WhatsApp Group-Operation Rate Limiter — HARD CAPS
 *
 * Same model as the message-send limiter ([qrSendRateLimit.ts]), but for group
 * participant operations during a merge (each member ADD or REMOVE = 1 op):
 *   - 15 operations per rolling clock-hour (IST)
 *   - 150 operations per day (resets at 5:00 AM IST)
 *
 * Adding/removing many group members quickly is a strong WhatsApp ban signal,
 * so we treat each member op exactly like a message: counted in MongoDB (so it
 * survives restarts and applies across jobs), hard-capped, and paced with
 * human-like random delays in the caller. Once a cap is hit, NO more ops run
 * until the next reset.
 */
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

export const GROUP_OP_DAILY_LIMIT = 150;
export const GROUP_OP_HOURLY_LIMIT = 15;

const COLLECTION = 'qr_group_op_rate_counters';

/** Day key = YYYY-MM-DD in IST, with cutover at 5:00 AM (not midnight). */
function getDayKeyIST(now = new Date()): string {
  const istMs = now.getTime() + 5.5 * 3600 * 1000;
  const shifted = new Date(istMs - 5 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Hour key = YYYY-MM-DD-HH in IST. */
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

export type GroupOpCheck =
  | { allowed: true; daySent: number; hourSent: number; dayRemaining: number; hourRemaining: number }
  | { allowed: false; reason: 'daily_cap' | 'hourly_cap'; daySent: number; hourSent: number; resetAt: Date };

/** Read remaining group-op budget without mutating — for pacing decisions. */
export async function checkGroupOpLimit(userId: string): Promise<GroupOpCheck> {
  await connectDB();
  const col = mongoose.connection.db!.collection(COLLECTION);
  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc = await col.findOne({ userId, dayKey });
  const daySent = (doc?.daySent as number) || 0;
  const hourSent = doc?.hourKey === hourKey ? ((doc?.hourSent as number) || 0) : 0;

  if (daySent >= GROUP_OP_DAILY_LIMIT) {
    return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
  }
  if (hourSent >= GROUP_OP_HOURLY_LIMIT) {
    return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
  }
  return {
    allowed: true,
    daySent,
    hourSent,
    dayRemaining: GROUP_OP_DAILY_LIMIT - daySent,
    hourRemaining: GROUP_OP_HOURLY_LIMIT - hourSent,
  };
}

/**
 * Atomically reserve ONE group-op slot. Call immediately before each member
 * add/remove. If it returns allowed:false, DO NOT perform the op — the cap is hit.
 */
export async function reserveGroupOpSlot(userId: string): Promise<GroupOpCheck> {
  await connectDB();
  const col = mongoose.connection.db!.collection(COLLECTION);
  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();

  await col.updateOne(
    { userId, dayKey },
    { $setOnInsert: { userId, dayKey, daySent: 0, createdAt: new Date() }, $set: { lastUpdated: new Date() } },
    { upsert: true }
  );
  await col.updateOne(
    { userId, dayKey, hourKey: { $ne: hourKey } },
    { $set: { hourKey, hourSent: 0 } }
  );

  const updated = await col.findOneAndUpdate(
    { userId, dayKey, daySent: { $lt: GROUP_OP_DAILY_LIMIT }, hourSent: { $lt: GROUP_OP_HOURLY_LIMIT } },
    { $inc: { daySent: 1, hourSent: 1 }, $set: { hourKey, lastUpdated: new Date() } },
    { returnDocument: 'after' }
  ) as any;

  const doc: any = updated?.value ?? updated;
  if (!doc) {
    const current = await col.findOne({ userId, dayKey });
    const daySent = (current?.daySent as number) || 0;
    const hourSent = current?.hourKey === hourKey ? ((current?.hourSent as number) || 0) : 0;
    if (daySent >= GROUP_OP_DAILY_LIMIT) {
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
    dayRemaining: GROUP_OP_DAILY_LIMIT - daySent,
    hourRemaining: GROUP_OP_HOURLY_LIMIT - hourSent,
  };
}
