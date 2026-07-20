/**
 * QR WhatsApp Send Rate Limiter — HARD CAPS, PER WHATSAPP NUMBER
 *
 * Enforces:
 *   - 150 messages per day (resets at 5:00 AM IST)
 *   - 15 messages per hour (rolling clock-hour in IST)
 *
 * Counters live in MongoDB so they survive Vercel cold starts and apply across
 * the manual broadcast endpoint AND the cron processor. Once a cap is hit,
 * NO MORE messages send until the next reset — no UI override possible.
 *
 * These caps + the 5 AM–10:30 PM IST send window + ~1 msg/5 min pacing keep a
 * single number well under WhatsApp's spam-detection thresholds.
 *
 * IMPORTANT: the budget is keyed by the WhatsApp NUMBER (via `whatsapp_accounts`,
 * looked up from the caller's connected phone), not by the logged-in user —
 * same reasoning as [qrGroupOpRateLimit.ts]. If two team members send from the
 * same shared WhatsApp number, they draw from the SAME 15/hour, 150/day pool;
 * otherwise N people sharing one number could each get their own 15/hour,
 * multiplying real send traffic to that number by N. Every call still takes a
 * `userId` (unchanged signature for existing callers); it's resolved to the
 * connected phone number internally via `CRMUserSettings.qrConnectedPhoneNumber`.
 * If no connected phone can be resolved yet, falls back to a per-user key so
 * the caller isn't blocked outright.
 */
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getWhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';

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

/** Resolve a userId's connected WhatsApp number, and a stable rate-limit key for it. */
async function resolveRateLimitKey(userId: string): Promise<{ key: string; isPhoneKeyed: boolean }> {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const settings: any = await CRMUserSettings.findOne({ userId }, { qrConnectedPhoneNumber: 1 }).lean();
  const digits = String(settings?.qrConnectedPhoneNumber || '').replace(/\D/g, '');
  if (digits) return { key: `phone:${digits}`, isPhoneKeyed: true };
  // No connected phone yet — fall back to per-user so callers aren't blocked outright.
  return { key: `user:${userId}`, isPhoneKeyed: false };
}

/**
 * Find (or lazily create) the counter-holding document for a rate-limit key.
 * Phone-keyed budgets live on the `whatsapp_accounts` doc for that number
 * (shared across every user of that number); user-keyed fallback budgets
 * live on `crm_user_settings` as before.
 */
async function getCounterDoc(rateKey: { key: string; isPhoneKeyed: boolean }) {
  if (rateKey.isPhoneKeyed) {
    const WhatsAppAccount = getWhatsAppAccount();
    const digits = rateKey.key.slice('phone:'.length);
    return { Model: WhatsAppAccount, filter: { commonPhoneNumber: `+${digits}` }, upsertExtra: { accountName: digits, accountType: 'common', commonProvider: 'manual', createdByUserId: 'system-rate-limiter', isActive: true } };
  }
  const CRMUserSettings = getCRMUserSettings();
  const userId = rateKey.key.slice('user:'.length);
  return { Model: CRMUserSettings, filter: { userId }, upsertExtra: { userId } };
}

/**
 * Check (without incrementing) whether one more send is allowed for this user.
 * Use this before queuing a broadcast — gives a clear yes/no plus current counts.
 */
export async function checkRateLimit(userId: string): Promise<RateCheckResult> {
  await connectDB();
  const rateKey = await resolveRateLimitKey(userId);
  const { Model, filter } = await getCounterDoc(rateKey);

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc = await Model.findOne(filter, { 'metadata.qrSendRateCounter': 1 }).lean();
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
  const rateKey = await resolveRateLimitKey(userId);
  const { Model, filter, upsertExtra } = await getCounterDoc(rateKey);

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();

  // Reset the whole counter if we rolled into a new day (5 AM IST cutover).
  try {
    await Model.updateOne(
      {
        ...filter,
        $or: [
          { 'metadata.qrSendRateCounter.dayKey': { $ne: dayKey } },
          { 'metadata.qrSendRateCounter': { $exists: false } },
          { metadata: { $exists: false } },
        ],
      },
      {
        $set: { 'metadata.qrSendRateCounter': { dayKey, daySent: 0, hourKey, hourSent: 0, lastUpdated: new Date() } },
        $setOnInsert: upsertExtra,
      },
      { upsert: true }
    );
  } catch (err: any) {
    // E11000: another concurrent call already upserted this doc (unique index
    // on userId or commonPhoneNumber). The doc now exists either way, so it's
    // safe to fall through to the hour-reset and reservation steps below.
    if (err?.code !== 11000) throw err;
  }

  // Reset the hour counter if we moved to a new clock-hour (same day).
  await Model.updateOne(
    { ...filter, 'metadata.qrSendRateCounter.dayKey': dayKey, 'metadata.qrSendRateCounter.hourKey': { $ne: hourKey } },
    { $set: { 'metadata.qrSendRateCounter.hourKey': hourKey, 'metadata.qrSendRateCounter.hourSent': 0 } }
  );

  // Atomic check-and-increment: only increment if BOTH caps would still be respected.
  const updated: any = await Model.findOneAndUpdate(
    {
      ...filter,
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
    const current: any = await Model.findOne(filter, { 'metadata.qrSendRateCounter': 1 }).lean();
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
  const rateKey = await resolveRateLimitKey(userId);
  const { Model, filter } = await getCounterDoc(rateKey);

  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc = await Model.findOne(filter, { 'metadata.qrSendRateCounter': 1 }).lean();
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
