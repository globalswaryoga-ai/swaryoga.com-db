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
import { connectDB, USE_BUNNY_DATABASE_ONLY } from '@/lib/db';
import { getCRMUserSettings, getWhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyCrmUserSettings } from '@/lib/bunnyCrmSettings';

export const DAILY_LIMIT = 150;
export const HOURLY_LIMIT = 15;
// Floor between ANY two sends on the same WhatsApp number, regardless of
// which schedule/broadcast run triggered them. The hour/day caps above limit
// total volume but don't stop two DIFFERENT concurrent schedules from both
// coming due in the same 1-minute cron tick and firing near-simultaneously
// into different groups — see reserveSendGap().
export const MIN_SEND_GAP_MS = 60000;

let bunnyRateLimitSchemaPromise: Promise<void> | null = null;

async function ensureBunnyRateLimitSchema(): Promise<void> {
  if (!bunnyRateLimitSchemaPromise) {
    bunnyRateLimitSchemaPromise = bunnyBatch([{
      sql: `CREATE TABLE IF NOT EXISTS qr_send_rate_limits_sql (
        rate_key TEXT PRIMARY KEY,
        day_key TEXT NOT NULL,
        day_sent INTEGER NOT NULL DEFAULT 0,
        hour_key TEXT NOT NULL,
        hour_sent INTEGER NOT NULL DEFAULT 0,
        last_send_at TEXT,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    }]).then(() => undefined).catch(error => {
      bunnyRateLimitSchemaPromise = null;
      throw error;
    });
  }
  await bunnyRateLimitSchemaPromise;
}

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
async function resolveRateLimitKey(userId: string, useBunny = USE_BUNNY_DATABASE_ONLY): Promise<{ key: string; isPhoneKeyed: boolean }> {
  if (useBunny) {
    const settings = await getBunnyCrmUserSettings(userId);
    const digits = String(settings?.qrConnectedPhoneNumber || '').replace(/\D/g, '');
    if (digits) return { key: `phone:${digits}`, isPhoneKeyed: true };
    return { key: `user:${userId}`, isPhoneKeyed: false };
  }
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
export async function checkRateLimit(userId: string, useBunny = USE_BUNNY_DATABASE_ONLY): Promise<RateCheckResult> {
  if (useBunny) {
    const rateKey = await resolveRateLimitKey(userId, useBunny);
    await ensureBunnyRateLimitSchema();
    const result = await bunnyExecute({
      sql: 'SELECT day_key, day_sent, hour_key, hour_sent FROM qr_send_rate_limits_sql WHERE rate_key = ? LIMIT 1',
      args: [rateKey.key],
    });
    const counter = result.rows[0];
    const daySent = counter?.day_key === getDayKeyIST() ? Number(counter.day_sent || 0) : 0;
    const hourSent = counter?.day_key === getDayKeyIST() && counter?.hour_key === getHourKeyIST()
      ? Number(counter.hour_sent || 0)
      : 0;
    if (daySent >= DAILY_LIMIT) return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
    if (hourSent >= HOURLY_LIMIT) return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
    return { allowed: true, daySent, hourSent, dayRemaining: DAILY_LIMIT - daySent, hourRemaining: HOURLY_LIMIT - hourSent };
  }
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
export async function reserveSendSlot(userId: string, useBunny = USE_BUNNY_DATABASE_ONLY): Promise<RateCheckResult> {
  if (useBunny) {
    const rateKey = await resolveRateLimitKey(userId, useBunny);
    await ensureBunnyRateLimitSchema();
    const dayKey = getDayKeyIST();
    const hourKey = getHourKeyIST();
    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `INSERT OR IGNORE INTO qr_send_rate_limits_sql
        (rate_key,day_key,day_sent,hour_key,hour_sent,updated_at) VALUES (?,?,0,?,0,?)`,
      args: [rateKey.key, dayKey, hourKey, now],
    });
    await bunnyExecute({
      sql: `UPDATE qr_send_rate_limits_sql SET day_key=?,day_sent=0,hour_key=?,hour_sent=0,updated_at=?
        WHERE rate_key=? AND day_key<>?`,
      args: [dayKey, hourKey, now, rateKey.key, dayKey],
    });
    await bunnyExecute({
      sql: `UPDATE qr_send_rate_limits_sql SET hour_key=?,hour_sent=0,updated_at=?
        WHERE rate_key=? AND day_key=? AND hour_key<>?`,
      args: [hourKey, now, rateKey.key, dayKey, hourKey],
    });
    const reservation = await bunnyExecute({
      sql: `UPDATE qr_send_rate_limits_sql
        SET day_sent=day_sent+1,hour_sent=hour_sent+1,updated_at=?
        WHERE rate_key=? AND day_key=? AND hour_key=? AND day_sent<? AND hour_sent<?`,
      args: [now, rateKey.key, dayKey, hourKey, DAILY_LIMIT, HOURLY_LIMIT],
    });
    const countResult = await bunnyExecute({
      sql: 'SELECT day_sent, hour_sent FROM qr_send_rate_limits_sql WHERE rate_key=? LIMIT 1',
      args: [rateKey.key],
    });
    const counter = countResult.rows[0];
    const daySent = Number(counter?.day_sent || 0);
    const hourSent = Number(counter?.hour_sent || 0);
    if (reservation.rowsAffected === 0) {
      if (daySent >= DAILY_LIMIT) return { allowed: false, reason: 'daily_cap', daySent, hourSent, resetAt: getNext5AMIST() };
      return { allowed: false, reason: 'hourly_cap', daySent, hourSent, resetAt: getNextHour() };
    }
    return { allowed: true, daySent, hourSent, dayRemaining: DAILY_LIMIT - daySent, hourRemaining: HOURLY_LIMIT - hourSent };
  }
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

export type GapCheckResult =
  | { allowed: true }
  | { allowed: false; msSinceLastSend: number };

/**
 * Atomically enforce a minimum gap between ANY two sends on the same
 * WhatsApp number (phone-keyed, same as reserveSendSlot), regardless of which
 * schedule/broadcast run triggered them. reserveSendSlot() caps total
 * hourly/daily volume per number but doesn't stop two DIFFERENT concurrent
 * schedules from both firing in the same cron tick — a fan-out-to-many-groups
 * pattern that's a well-known WhatsApp spam-detection trigger. Call this
 * right alongside reserveSendSlot, immediately before the actual bridge send.
 */
export async function reserveSendGap(
  userId: string,
  minGapMs: number = MIN_SEND_GAP_MS,
  useBunny = USE_BUNNY_DATABASE_ONLY,
): Promise<GapCheckResult> {
  if (useBunny) {
    const rateKey = await resolveRateLimitKey(userId, useBunny);
    await ensureBunnyRateLimitSchema();
    const now = new Date();
    const nowIso = now.toISOString();
    await bunnyExecute({
      sql: `INSERT OR IGNORE INTO qr_send_rate_limits_sql
        (rate_key,day_key,day_sent,hour_key,hour_sent,updated_at) VALUES (?,?,0,?,0,?)`,
      args: [rateKey.key, getDayKeyIST(now), getHourKeyIST(now), nowIso],
    });
    const reserved = await bunnyExecute({
      sql: `UPDATE qr_send_rate_limits_sql SET last_send_at=?,updated_at=?
        WHERE rate_key=? AND (last_send_at IS NULL OR last_send_at<=?)`,
      args: [nowIso, nowIso, rateKey.key, new Date(now.getTime() - minGapMs).toISOString()],
    });
    if (reserved.rowsAffected > 0) return { allowed: true };
    const current = await bunnyExecute({
      sql: 'SELECT last_send_at FROM qr_send_rate_limits_sql WHERE rate_key=? LIMIT 1',
      args: [rateKey.key],
    });
    const lastSendAt = current.rows[0]?.last_send_at ? new Date(String(current.rows[0].last_send_at)).getTime() : 0;
    return { allowed: false, msSinceLastSend: Math.max(0, now.getTime() - lastSendAt) };
  }
  await connectDB();
  const rateKey = await resolveRateLimitKey(userId);
  const { Model, filter, upsertExtra } = await getCounterDoc(rateKey);

  // Ensure the doc exists — benign no-op if reserveSendSlot (called just
  // before this in the processor) already created it.
  try {
    await Model.updateOne(filter, { $setOnInsert: upsertExtra }, { upsert: true });
  } catch (err: any) {
    if (err?.code !== 11000) throw err; // concurrent upsert already created it
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - minGapMs);

  // Atomic check-and-set: only succeeds if no send is recorded yet, or the
  // last one is old enough. Whoever wins this race claims the gap.
  const updated: any = await Model.findOneAndUpdate(
    {
      ...filter,
      $or: [
        { 'metadata.qrLastSendAt': { $exists: false } },
        { 'metadata.qrLastSendAt': { $lte: cutoff } },
      ],
    },
    { $set: { 'metadata.qrLastSendAt': now } },
    { new: true }
  ).lean();

  if (updated) return { allowed: true };

  const current: any = await Model.findOne(filter, { 'metadata.qrLastSendAt': 1 }).lean();
  const lastSendAt = current?.metadata?.qrLastSendAt ? new Date(current.metadata.qrLastSendAt).getTime() : 0;
  return { allowed: false, msSinceLastSend: Math.max(0, now.getTime() - lastSendAt) };
}

/** Read current counts without mutating — for UI/status display. */
export async function getCurrentCounts(userId: string): Promise<{ daySent: number; hourSent: number; dayRemaining: number; hourRemaining: number }> {
  if (USE_BUNNY_DATABASE_ONLY) {
    const rateKey = await resolveRateLimitKey(userId);
    await ensureBunnyRateLimitSchema();
    const result = await bunnyExecute({
      sql: 'SELECT day_key, day_sent, hour_key, hour_sent FROM qr_send_rate_limits_sql WHERE rate_key=? LIMIT 1',
      args: [rateKey.key],
    });
    const counter = result.rows[0];
    const daySent = counter?.day_key === getDayKeyIST() ? Number(counter.day_sent || 0) : 0;
    const hourSent = counter?.day_key === getDayKeyIST() && counter?.hour_key === getHourKeyIST()
      ? Number(counter.hour_sent || 0)
      : 0;
    return { daySent, hourSent, dayRemaining: Math.max(0, DAILY_LIMIT - daySent), hourRemaining: Math.max(0, HOURLY_LIMIT - hourSent) };
  }
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
