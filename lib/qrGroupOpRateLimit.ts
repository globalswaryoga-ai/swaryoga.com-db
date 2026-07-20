/**
 * QR WhatsApp Group-Operation Rate Limiter — HARD CAPS, PER WHATSAPP NUMBER
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
 *
 * IMPORTANT: the budget is keyed by the WhatsApp NUMBER (via `whatsapp_accounts`,
 * looked up from the caller's connected phone), not by the logged-in user. If
 * two team members both operate the same shared WhatsApp number, they draw
 * from the SAME 15/hour, 150/day pool — otherwise N people sharing one number
 * could each get their own 15/hour, multiplying real traffic to that number
 * by N and defeating the whole point of the cap. Every call still takes a
 * `userId` (unchanged signature for existing callers); it's resolved to the
 * connected phone number internally via `CRMUserSettings.qrConnectedPhoneNumber`.
 * If no connected phone can be resolved yet (e.g. account not scanned in),
 * falls back to a per-user key so the caller isn't blocked outright.
 */
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getWhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';

export const GROUP_OP_DAILY_LIMIT = 150;
export const GROUP_OP_HOURLY_LIMIT = 15;

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

export type GroupOpCheck =
  | { allowed: true; daySent: number; hourSent: number; dayRemaining: number; hourRemaining: number }
  | { allowed: false; reason: 'daily_cap' | 'hourly_cap'; daySent: number; hourSent: number; resetAt: Date };

/** Read remaining group-op budget without mutating — for pacing decisions. */
export async function checkGroupOpLimit(userId: string): Promise<GroupOpCheck> {
  await connectDB();
  const rateKey = await resolveRateLimitKey(userId);
  const { Model, filter } = await getCounterDoc(rateKey);
  const dayKey = getDayKeyIST();
  const hourKey = getHourKeyIST();
  const doc: any = await Model.findOne(filter, { 'metadata.qrGroupOpRateCounter': 1 }).lean();
  const counter = doc?.metadata?.qrGroupOpRateCounter;

  const daySent = counter?.dayKey === dayKey ? (counter?.daySent || 0) : 0;
  const hourSent = (counter?.dayKey === dayKey && counter?.hourKey === hourKey) ? (counter?.hourSent || 0) : 0;

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
          { 'metadata.qrGroupOpRateCounter.dayKey': { $ne: dayKey } },
          { 'metadata.qrGroupOpRateCounter': { $exists: false } },
          { metadata: { $exists: false } },
        ],
      },
      {
        $set: { 'metadata.qrGroupOpRateCounter': { dayKey, daySent: 0, hourKey, hourSent: 0, lastUpdated: new Date() } },
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
    { ...filter, 'metadata.qrGroupOpRateCounter.dayKey': dayKey, 'metadata.qrGroupOpRateCounter.hourKey': { $ne: hourKey } },
    { $set: { 'metadata.qrGroupOpRateCounter.hourKey': hourKey, 'metadata.qrGroupOpRateCounter.hourSent': 0 } }
  );

  // Atomic check-and-increment: only increment if BOTH caps would still be respected.
  const updated: any = await Model.findOneAndUpdate(
    {
      ...filter,
      'metadata.qrGroupOpRateCounter.dayKey': dayKey,
      'metadata.qrGroupOpRateCounter.hourKey': hourKey,
      'metadata.qrGroupOpRateCounter.daySent': { $lt: GROUP_OP_DAILY_LIMIT },
      'metadata.qrGroupOpRateCounter.hourSent': { $lt: GROUP_OP_HOURLY_LIMIT },
    },
    {
      $inc: { 'metadata.qrGroupOpRateCounter.daySent': 1, 'metadata.qrGroupOpRateCounter.hourSent': 1 },
      $set: { 'metadata.qrGroupOpRateCounter.lastUpdated': new Date() },
    },
    { new: true }
  ).lean();

  if (!updated) {
    const current: any = await Model.findOne(filter, { 'metadata.qrGroupOpRateCounter': 1 }).lean();
    const counter = current?.metadata?.qrGroupOpRateCounter;
    const daySent = (counter?.daySent as number) || 0;
    const hourSent = counter?.hourKey === hourKey ? ((counter?.hourSent as number) || 0) : 0;
    if (daySent >= GROUP_OP_DAILY_LIMIT) {
      return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
    }
    return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
  }

  const counter = updated.metadata.qrGroupOpRateCounter;
  const daySent = (counter.daySent as number) || 0;
  const hourSent = (counter.hourSent as number) || 0;
  return {
    allowed: true,
    daySent,
    hourSent,
    dayRemaining: GROUP_OP_DAILY_LIMIT - daySent,
    hourRemaining: GROUP_OP_HOURLY_LIMIT - hourSent,
  };
}
