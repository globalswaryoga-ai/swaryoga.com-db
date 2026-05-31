import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getQRBroadcastSchedule, getWhatsAppMessage, getQrWhatsAppMessage, getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { shuffleArray } from '@/lib/whatsappRateLimiter';
import { getWhatsAppComplianceStatus } from '@/lib/whatsappGapCalculator';
import { checkSessionHealth, sendSessionHeartbeat } from '@/lib/whatsappConnectionManager';
import { reserveMessageSend } from '@/lib/messageDeduplication';
import { isQRSendAllowed } from '@/lib/qrTimeGuard';
import { reserveSendSlot, DAILY_LIMIT, HOURLY_LIMIT } from '@/lib/qrSendRateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

/**
 * Check if current time falls within time window (5 AM to 10:30 PM IST)
 */
function isWithinTimeWindow(startTime: string, endTime: string, timezone: string = 'Asia/Kolkata'): boolean {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

  const currentHours = istTime.getHours();
  const currentMinutes = istTime.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startTimeInMinutes = startHour * 60 + startMin;
  const endTimeInMinutes = endHour * 60 + endMin;

  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
}

/**
 * Check if schedule should run today
 * For 'once' frequency, also checks firstRunDate (scheduled specific date)
 */
function shouldRunToday(frequency: string, daysOfWeek: number[], firstRunDate?: Date): boolean {
  if (frequency === 'once') {
    // If a specific scheduled date was set, only run on that date (IST comparison)
    if (firstRunDate) {
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const scheduledIST = new Date(firstRunDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const todayStr = nowIST.toDateString();
      const scheduledStr = scheduledIST.toDateString();
      if (todayStr !== scheduledStr) {
        console.log(`[QR Broadcast V2] 'once' schedule has firstRunDate ${scheduledStr}, today is ${todayStr}. Skipping.`);
        return false;
      }
    }
    return true;
  }
  if (frequency === 'daily') return true;

  if (frequency === 'weekly') {
    const today = new Date().getDay();
    const shouldRun = daysOfWeek.includes(today);
    return shouldRun;
  }

  // Unknown frequency — default to false (don't run)
  console.warn(`[QR Broadcast V2] Unknown frequency: ${frequency}`);
  return false;
}

/**
 * Send single message with deduplication check
 */
/**
 * Resolve the active session key and tenant ID from the bridge for a given userId.
 * The bridge REQUIRES both x-session-key and x-tenant-id headers to route correctly.
 */
async function resolveSessionInfo(
  userId: string,
  bridgeUrl: string,
  bridgeSecret: string
): Promise<{ sessionKey: string; tenantId: string } | null> {
  try {
    const res = await fetch(`${bridgeUrl}/sessions`, {
      headers: { 'x-bridge-secret': bridgeSecret },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sessions: any[] = data?.sessions || [];
    // STRICT: only return a session owned by this specific user — never fall back to another user's session
    const own = sessions.find(s => s.userId === userId && s.status === 'connected');
    if (!own) return null;
    return { sessionKey: String(own.sessionKey), tenantId: String(own.tenantId || own.sessionKey) };
  } catch {
    return null;
  }
}

// Zero-width chars used to vary outgoing message payloads so WhatsApp
// can't fingerprint identical-text spam patterns. Visible content unchanged.
const ZW_CHARS = ['​', '‌', '‍', '﻿'];
function humanizeMessage(base: string, index: number): string {
  if (!base) return base;
  const zwCount = index % 3;
  let suffix = '';
  for (let i = 0; i < zwCount; i++) suffix += ZW_CHARS[Math.floor(Math.random() * ZW_CHARS.length)];
  if (index % 4 === 0) suffix += ' ';
  return base + suffix;
}

async function sendMessageWithGaps(
  chatId: string,
  messageText: string,
  bridgeUrl: string,
  bridgeSecret: string,
  delayBefore: number,
  userId: string,
  scheduleId: string,
  db: any,
  mediaUrls?: string[],
  sessionInfo?: { sessionKey: string; tenantId: string },
  messageIndex: number = 0,
): Promise<{ success: boolean; error?: string; sendTimeMs?: number; skipped?: boolean; restricted?: boolean }> {
  try {
    // CHECK 1: Atomic deduplication - reserve message slot before sending
    const reservation = await reserveMessageSend(userId, chatId, messageText, scheduleId, db);
    if (!reservation.reserved) {
      return { success: false, error: reservation.reason, skipped: true };
    }

    // Wait before sending (honor gap)
    await new Promise(resolve => setTimeout(resolve, delayBefore));

    const startTime = Date.now();
    const hasMedia = mediaUrls && mediaUrls.length > 0;

    // Build bridge headers — MUST include x-session-key AND x-tenant-id for routing
    const bridgeHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-bridge-secret': bridgeSecret,
      'x-user-id': userId,
    };
    if (sessionInfo?.sessionKey) bridgeHeaders['x-session-key'] = sessionInfo.sessionKey;
    if (sessionInfo?.tenantId)   bridgeHeaders['x-tenant-id']   = sessionInfo.tenantId;

    let sendOk = false;

    if (hasMedia) {
      // Send image with caption via /send (type:media) — bridge fetches URL and sends via Baileys
      const mediaUrl = mediaUrls![0];
      console.log(`[QR Broadcast V2] Sending image via /send type:media: ${mediaUrl} to ${chatId}`);

      const res = await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers: bridgeHeaders,
        body: JSON.stringify({
          to: chatId,
          type: 'media',
          media: mediaUrl,
          caption: messageText || '',
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData?.success !== false) {
        sendOk = true;
        console.log(`[QR Broadcast V2] ✓ Image sent to ${chatId}`);
      } else {
        console.warn(`[QR Broadcast V2] Image send failed for ${mediaUrl}: ${resData?.error || res.status}`);
      }
    } else if (messageText && messageText.trim()) {
      // Apply per-recipient invisible variation so payloads aren't byte-identical
      const variedText = humanizeMessage(messageText, messageIndex);
      const res = await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers: bridgeHeaders,
        body: JSON.stringify({ to: chatId, type: 'text', message: variedText }),
      });
      const resData = await res.json().catch(() => ({}));
      sendOk = res.ok && resData?.success !== false;
      if (!sendOk) {
        console.warn(`[QR Broadcast V2] Text send failed: ${resData?.error || res.status}`);
        const sendTimeMs = Date.now() - startTime;
        return {
          success: false,
          error: resData?.error || `Bridge ${res.status}`,
          restricted: !!resData?.restricted,
          sendTimeMs,
        };
      }
    }

    const sendTimeMs = Date.now() - startTime;

    if (!sendOk) {
      return { success: false, error: 'Bridge rejected message' };
    }

    return { success: true, sendTimeMs };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process schedule with WhatsApp-safe gaps
 */
async function processSchedule(schedule: any, bridgeUrl: string, bridgeSecret: string) {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentTimeStr = istTime.toLocaleTimeString('en-IN', { hour12: false });

  console.log(`[QR Broadcast Processor V2] Processing: ${schedule._id} (${schedule.name})`);
  console.log(`  Current time (IST): ${currentTimeStr}, Window: ${schedule.startTime}-${schedule.endTime}, Freq: ${schedule.frequency}, isActive: ${schedule.isActive}`);

  // LOCK: Prevent concurrent processing of same schedule
  const db = mongoose.connection.db;
  const locksCollection = db.collection('processor_locks');
  const lockKey = `schedule_${schedule._id}`;
  const lockExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min lock

  const existingLock = await locksCollection.findOne({ lockKey });
  if (existingLock && existingLock.expiresAt > new Date()) {
    console.log(`[QR Broadcast V2] ⚠️ Schedule is already being processed. Skipping.`);
    return { status: 'skipped', reason: 'already_being_processed' };
  }

  // Acquire lock
  await locksCollection.updateOne(
    { lockKey },
    { $set: { lockKey, expiresAt: lockExpiry, acquiredAt: new Date() } },
    { upsert: true }
  );

  try {
    // CHECK 0: Resolve session info dynamically (bridge needs BOTH x-session-key AND x-tenant-id)
    const sessionInfo = await resolveSessionInfo(schedule.userId, bridgeUrl, bridgeSecret);
    console.log(`[QR Broadcast V2] Session resolved for userId=${schedule.userId}: ${JSON.stringify(sessionInfo)}`);

    // If no connected session found for THIS user, pause — never send via another user's session
    if (!sessionInfo) {
      console.warn(`[QR Broadcast V2] ⚠️ No connected WhatsApp session for userId=${schedule.userId}. Pausing.`);
      const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());
      await QRBroadcastSchedule.updateOne(
        { _id: schedule._id },
        {
          status: 'paused',
          lastError: 'No connected WhatsApp session — please reconnect your QR WhatsApp',
          lastErrorAt: new Date(),
        }
      );
      return {
        status: 'paused',
        reason: 'no_session',
        message: 'No connected WhatsApp session for this user',
      };
    }

    const sessionHealth = await checkSessionHealth(
      schedule.userId,
      sessionInfo.sessionKey,
      bridgeUrl,
      bridgeSecret
    );

    if (!sessionHealth.connected) {
      console.warn(`[QR Broadcast V2] ⚠️ Session health check failed: ${sessionHealth.message}`);
      const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());
      await QRBroadcastSchedule.updateOne(
        { _id: schedule._id },
        {
          status: 'paused',
          lastError: 'Auto-signout detected - pausing to reconnect',
          lastErrorAt: new Date(),
        }
      );
      return {
        status: 'paused',
        reason: 'auto_signout_detected',
        message: 'Session reconnecting - operation paused',
      };
    }

    // Check time window
    if (!isWithinTimeWindow(schedule.startTime, schedule.endTime, schedule.timezone)) {
      console.log(`[QR Broadcast Processor V2] ⏰ Outside time window (${schedule.startTime}-${schedule.endTime})`);
      return { status: 'skipped', reason: 'outside_time_window' };
    }

    // A schedule that was already started but still has un-sent recipients is a
    // carry-over in progress (its earlier day hit the 150 cap). It must be allowed
    // to keep sending on following days regardless of frequency/date gates —
    // otherwise a one-time 300-recipient blast would strand the overflow forever.
    const totalCount = Array.isArray(schedule.recipientChatIds) ? schedule.recipientChatIds.length : 0;
    const sentCount = Array.isArray(schedule.sentRecipientChatIds) ? schedule.sentRecipientChatIds.length : 0;
    const hasCarryOver = totalCount > 0 && sentCount > 0 && sentCount < totalCount;

    // Check if should run today (skipped when a carry-over is mid-flight)
    if (!hasCarryOver && !shouldRunToday(schedule.frequency, schedule.daysOfWeek, schedule.firstRunDate)) {
      const today = new Date();
      console.log(`[QR Broadcast Processor V2] 📅 Not scheduled for today (frequency: ${schedule.frequency}, daysOfWeek: ${schedule.daysOfWeek}, today: ${today.getDay()}, firstRunDate: ${schedule.firstRunDate})`);
      return { status: 'skipped', reason: 'not_scheduled_for_today' };
    }

    // NOTE: We intentionally do NOT skip on "already ran today". This processor
    // now sends ~1 message per 5-min tick (drip pacing), so it must run many
    // times per day. Cross-day progress is tracked by sentRecipientChatIds
    // (carry-over cursor) + the 150/day rate cap, not by lastRunDate.

    // Look up the owner's connected WhatsApp phone number (needed for qr_whatsapp_messages save)
    const CRMUserSettings = getCRMUserSettings();
    const ownerSettings = await CRMUserSettings.findOne(
      { userId: schedule.userId },
      { qrConnectedPhoneNumber: 1 }
    ).lean();
    const connectedPhone = String((ownerSettings as any)?.qrConnectedPhoneNumber || '').split(':')[0].split('@')[0].replace(/\D/g, '');

    const QRBroadcastScheduleModel = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());

    const isRecurring = schedule.frequency !== 'once';

    // ── RECURRING RESET ──
    // For daily/weekly schedules, each new scheduled day is a FRESH pass to the
    // whole list. If the last run was on a previous IST day, clear the cursor so
    // everyone is messaged again today (one-time 'once' schedules never reset).
    const istTodayStr = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString();
    const lastRunIstStr = schedule.lastRunDate
      ? new Date(new Date(schedule.lastRunDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString()
      : null;
    const isNewDay = lastRunIstStr !== istTodayStr;
    if (isRecurring && isNewDay && Array.isArray(schedule.sentRecipientChatIds) && schedule.sentRecipientChatIds.length > 0) {
      await QRBroadcastScheduleModel.updateOne(
        { _id: schedule._id },
        { $set: { sentRecipientChatIds: [], status: 'in-progress' } }
      );
      schedule.sentRecipientChatIds = [];
      console.log(`[QR Broadcast V2] 🔁 New ${schedule.frequency} occurrence — cursor reset, re-sending full list today.`);
    }

    // ── CARRY-OVER CURSOR ──
    // Pending = every recipient NOT yet successfully sent. When the 150/day cap
    // pauses sending, the leftover stays in `pending` and is picked up on the
    // next day automatically — nothing is dropped.
    const allRecipients: string[] = Array.isArray(schedule.recipientChatIds) ? schedule.recipientChatIds : [];
    const alreadySent: Set<string> = new Set(
      Array.isArray(schedule.sentRecipientChatIds) ? schedule.sentRecipientChatIds : []
    );
    const pending = allRecipients.filter((id) => !alreadySent.has(id));

    // Nothing left for this pass.
    if (pending.length === 0) {
      // Recurring → re-arm as 'scheduled' so it fires again on the next day.
      // One-time → terminal 'completed'.
      await QRBroadcastScheduleModel.updateOne(
        { _id: schedule._id },
        { status: isRecurring ? 'scheduled' : 'completed', lastRunDate: new Date() }
      );
      console.log(`[QR Broadcast V2] ✅ Pass done — all ${allRecipients.length} sent. ${isRecurring ? 'Re-armed for next occurrence.' : 'Schedule complete.'}`);
      return { status: isRecurring ? 'idle_until_next_occurrence' : 'completed', reason: 'all_recipients_sent', sent: 0, totalRecipients: allRecipients.length };
    }

    // ── PER-TICK DRIP PACING (human-like) — TARGET 15 messages/hour ──
    // Cron fires every 4 min = 15 ticks/hour. Sending an average of 1 message
    // per tick yields exactly 15/hr. Light skip/burst jitter keeps it human:
    //   15% skip · 70% send 1 · 15% send 2  →  avg 1.0 msg/tick = 15/hr.
    // The HOURLY_LIMIT (15) hard cap guarantees it never exceeds 15/hr, and the
    // DAILY_LIMIT (150) ceiling pauses the run once 150 are sent (carry-over).
    const roll = Math.random();
    let perTickMax = 1;
    if (roll < 0.15) perTickMax = 0;        // ~15% of ticks: skip (longer human gap)
    else if (roll > 0.85) perTickMax = 2;   // ~15% of ticks: small 2-message burst

    if (perTickMax === 0) {
      await QRBroadcastScheduleModel.updateOne({ _id: schedule._id }, { status: 'in-progress' });
      console.log(`[QR Broadcast V2] ⏭️  Human-pacing skip this tick (${pending.length} pending).`);
      return { status: 'skipped', reason: 'human_pacing_skip', pending: pending.length };
    }

    // Shuffle pending (100% human randomization) and take just this tick's slice.
    const recipients = shuffleArray([...pending]).slice(0, perTickMax);

    // Small jitter between the 1-2 messages in a single tick so they aren't
    // byte-for-byte simultaneous. The real ~5-min spacing comes from the cron.
    const tickJitterMs = () => 2000 + Math.floor(Math.random() * 10000); // 2–12s

    // Check WhatsApp compliance (informational)
    const compliance = getWhatsAppComplianceStatus(allRecipients.length, 1);
    console.log(`[QR Broadcast V2] Drip: sending ${recipients.length} now, ${pending.length} pending of ${allRecipients.length} total. ${compliance.riskLevel}`);

    // Recipients newly sent in THIS tick (added to the carry-over cursor at the end)
    const newlySentIds: string[] = [];

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let totalSendTimeMs = 0;
    let heartbeatCheckCounter = 0;

    // Get database for deduplication
    const db = mongoose.connection.db;

    // Send this tick's 1-2 recipients (real spacing comes from the 5-min cron)
    for (let i = 0; i < recipients.length; i++) {
      const chatId = recipients[i];
      const gap = i === 0 ? 0 : tickJitterMs(); // first is immediate, 2nd gets small jitter

      // HEARTBEAT CHECK: Every 10 messages, verify session is still connected
      heartbeatCheckCounter++;
      if (heartbeatCheckCounter >= 10) {
        const heartbeat = await sendSessionHeartbeat(
          schedule.userId,
          sessionInfo.sessionKey,
          bridgeUrl,
          bridgeSecret
        );

        if (!heartbeat.alive) {
          console.error('[QR Broadcast V2] 🚨 Session lost during broadcast. Pausing.');
          const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());
          await QRBroadcastSchedule.updateOne(
            { _id: schedule._id },
            {
              status: 'paused',
              lastError: 'Auto-signout during broadcast - pausing to reconnect',
              lastErrorAt: new Date(),
              'stats.totalAttempted': (schedule.stats?.totalAttempted || 0) + (sent + failed + skipped),
              'stats.totalSent': (schedule.stats?.totalSent || 0) + sent,
              'stats.totalFailed': (schedule.stats?.totalFailed || 0) + failed,
              'stats.totalSkipped': (schedule.stats?.totalSkipped || 0) + skipped,
            }
          );
          return {
            status: 'paused',
            reason: 'auto_signout_during_broadcast',
            sent,
            failed,
            skipped,
            message: `Paused after ${sent + failed + skipped} messages. Session lost. Will resume when reconnected.`,
          };
        }

        heartbeatCheckCounter = 0;
        console.log(`[QR Broadcast V2] ✅ Heartbeat OK - session still alive`);
      }

      // ── ATOMIC RATE-LIMIT RESERVATION (150/day, 15/hr hard caps) ──
      // Hitting a cap is NORMAL drip behaviour, not an error. We keep the
      // schedule 'in-progress' so it auto-resumes after the cap resets
      // (hourly cap → next hour, daily cap → 5 AM IST). The carry-over cursor
      // (sentRecipientChatIds) preserves exactly who still needs the message,
      // so the remainder is sent on following ticks/days — nothing is dropped.
      const slot = await reserveSendSlot(schedule.userId);
      if (!slot.allowed) {
        // Persist anyone already sent in this tick before we stop.
        const update: any = {
          status: 'in-progress',
          lastError: slot.reason === 'daily_cap'
            ? `Daily cap ${DAILY_LIMIT} reached — carries over, resumes ${slot.resetAt.toISOString()}`
            : `Hourly cap ${HOURLY_LIMIT} reached — resumes ${slot.resetAt.toISOString()}`,
          lastErrorAt: new Date(),
          'stats.totalAttempted': (schedule.stats?.totalAttempted || 0) + (sent + failed + skipped),
          'stats.totalSent': (schedule.stats?.totalSent || 0) + sent,
          'stats.totalFailed': (schedule.stats?.totalFailed || 0) + failed,
          'stats.totalSkipped': (schedule.stats?.totalSkipped || 0) + skipped,
        };
        const capUpdateOp: any = { $set: update };
        if (newlySentIds.length > 0) capUpdateOp.$addToSet = { sentRecipientChatIds: { $each: newlySentIds } };
        await QRBroadcastScheduleModel.updateOne({ _id: schedule._id }, capUpdateOp);
        console.log(`[QR Broadcast V2] 🛑 ${slot.reason} reached for user=${schedule.userId}. ${sent} sent this tick. ${pending.length - newlySentIds.length} carry over.`);
        return {
          status: 'rate_capped',
          reason: slot.reason,
          sent,
          failed,
          skipped,
          pending: pending.length - newlySentIds.length,
          resetAt: slot.resetAt.toISOString(),
          message: `${slot.reason === 'daily_cap' ? 'Daily' : 'Hourly'} cap reached. ${pending.length - newlySentIds.length} carry over to next ${slot.reason === 'daily_cap' ? 'day' : 'hour'}.`,
        };
      }

      const result = await sendMessageWithGaps(
        chatId,
        schedule.messageText,
        bridgeUrl,
        bridgeSecret,
        gap,
        schedule.userId,
        schedule._id.toString(),
        db,
        Array.isArray(schedule.mediaUrls) && schedule.mediaUrls.length > 0
          ? schedule.mediaUrls
          : undefined,
        sessionInfo || undefined,  // passes both sessionKey + tenantId
        i,                          // index drives invisible message variation
      );

      // ── HARD STOP on WhatsApp restriction signal ──
      if (result.restricted) {
        console.error(`[QR Broadcast V2] 🚨 WhatsApp restriction detected — aborting schedule to protect number`);
        const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());
        await QRBroadcastSchedule.updateOne(
          { _id: schedule._id },
          {
            status: 'paused',
            isActive: false, // disable until human investigates
            lastError: `WhatsApp restricted the account: "${result.error}". Stop broadcasting for 24h.`,
            lastErrorAt: new Date(),
            'stats.totalAttempted': (schedule.stats?.totalAttempted || 0) + (sent + failed + skipped + 1),
            'stats.totalSent': (schedule.stats?.totalSent || 0) + sent,
            'stats.totalFailed': (schedule.stats?.totalFailed || 0) + failed + 1,
            'stats.totalSkipped': (schedule.stats?.totalSkipped || 0) + skipped,
          }
        );
        return {
          status: 'aborted',
          reason: 'whatsapp_restricted',
          sent,
          failed: failed + 1,
          skipped,
          message: `🚨 ABORTED — WhatsApp restricted this number. Schedule paused & disabled. Wait 24h.`,
        };
      }

      if (result.skipped) {
        skipped++;
        // Already delivered (dedup) → still counts as "done" for this recipient,
        // so advance the carry-over cursor past them.
        newlySentIds.push(chatId);
        console.log(
          `[QR Broadcast V2] ⊘ ${i + 1}/${recipients.length} skipped: ${result.error} (already sent today)`
        );
      } else if (result.success) {
        sent++;
        newlySentIds.push(chatId);
        totalSendTimeMs += (result.sendTimeMs || 0);
        console.log(
          `[QR Broadcast V2] ✓ ${i + 1}/${recipients.length} sent (gap: ${(gap / 1000).toFixed(1)}s)`
        );
        // Save directly to qr_whatsapp_messages (the collection the history/stats page reads).
        // The bridge webhook also saves here when it fires, but this guarantees the record
        // exists even if the webhook misfires or the phone isn't yet hydrated on the bridge.
        try {
          const chatJid = chatId.includes('@') ? chatId : `${chatId.replace(/\D/g, '')}@s.whatsapp.net`;
          const hasMedia = Array.isArray(schedule.mediaUrls) && schedule.mediaUrls.length > 0;
          const QrMsg = getQrWhatsAppMessage();
          const msgId = `broadcast-${schedule._id}-${chatId.replace(/\D/g, '')}-${Date.now()}`;
          if (connectedPhone) {
            await QrMsg.updateOne(
              { messageId: msgId, chatJid },
              {
                $set: {
                  userId: schedule.userId,
                  connectedPhone,
                  chatJid,
                  messageId: msgId,
                  direction: 'outbound',
                  fromMe: true,
                  text: schedule.messageText || (hasMedia ? '[media]' : ''),
                  type: hasMedia ? 'image' : 'text',
                  participant: '',
                  pushName: '',
                  timestamp: Math.floor(Date.now() / 1000),
                  status: 1, // sent
                  hasMedia,
                  mediaUrl: hasMedia ? schedule.mediaUrls[0] : '',
                  mediaMimetype: '',
                  mediaFileName: '',
                },
                $setOnInsert: { createdAt: new Date() },
              },
              { upsert: true }
            );
          }
        } catch (qrErr) {
          console.warn(`[QR Broadcast V2] Warning: Failed to save message to qr_whatsapp_messages:`, qrErr instanceof Error ? qrErr.message : String(qrErr));
        }
      } else {
        failed++;
        console.error(
          `[QR Broadcast V2] ✗ ${i + 1}/${recipients.length} failed: ${result.error} (gap: ${(gap / 1000).toFixed(1)}s)`
        );
      }

      // Stop if too many failures (might be banned)
      if (failed > 10 && (failed / (sent + failed)) > 0.3) {
        console.error('[QR Broadcast V2] ⚠️  High failure rate detected. Stopping to prevent ban.');
        return {
          status: 'failed',
          reason: 'high_failure_rate',
          sent,
          failed,
          skipped,
          message: `Stopped after ${sent + failed + skipped} messages due to ${Math.round((failed / (sent + failed)) * 100)}% failure rate`,
        };
      }
    }

    // Calculate average send time
    const avgSendTimeMs = sent > 0 ? Math.round(totalSendTimeMs / sent) : 0;

    // ── ADVANCE CARRY-OVER CURSOR ──
    // Everyone handled this tick (sent or already-delivered) is added so the
    // next tick continues with whoever is left. Schedule is only 'completed'
    // once the cursor covers EVERY recipient — otherwise it stays 'in-progress'
    // and keeps dripping (~1 msg / 5 min) across this day and into tomorrow.
    const totalDoneNow = alreadySent.size + newlySentIds.length;
    const allDone = totalDoneNow >= allRecipients.length;

    const finalUpdate: any = {
      $set: {
        // Recurring schedules re-arm to 'scheduled' (fire again next occurrence);
        // one-time schedules terminate as 'completed'.
        status: allDone ? (isRecurring ? 'scheduled' : 'completed') : 'in-progress',
        lastRunDate: new Date(),
        'stats.totalAttempted': (schedule.stats?.totalAttempted || 0) + recipients.length,
        'stats.totalSent': (schedule.stats?.totalSent || 0) + sent,
        'stats.totalFailed': (schedule.stats?.totalFailed || 0) + failed,
        'stats.totalSkipped': (schedule.stats?.totalSkipped || 0) + skipped,
        'stats.averageDeliveryTimeMs': avgSendTimeMs,
      },
    };
    if (newlySentIds.length > 0) finalUpdate.$addToSet = { sentRecipientChatIds: { $each: newlySentIds } };

    await QRBroadcastScheduleModel.updateOne({ _id: schedule._id }, finalUpdate);

    const remaining = allRecipients.length - totalDoneNow;
    console.log(`[QR Broadcast V2] ${allDone ? '✅ COMPLETE' : '⏳ Drip tick done'}: ${sent} sent, ${skipped} dup, ${failed} failed. ${remaining} pending of ${allRecipients.length}.`);

    return {
      status: allDone ? 'completed' : 'in-progress',
      sent,
      skipped,
      failed,
      pending: remaining,
      totalRecipients: allRecipients.length,
      compliance: compliance.riskLevel,
    };
  } catch (error) {
    console.error(`[QR Broadcast V2] Error:`, error);

    const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());
    await QRBroadcastSchedule.updateOne(
      { _id: schedule._id },
      {
        status: 'failed',
        lastRunDate: new Date(), // ← prevent infinite retry: mark as run so today check skips it
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastErrorAt: new Date(),
      }
    );

    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Release lock
    const locksCollection = db.collection('processor_locks');
    const lockKey = `schedule_${schedule._id}`;
    await locksCollection.deleteOne({ lockKey }).catch(() => {});
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret — Vercel Cron sends "Authorization: Bearer {CRON_SECRET}"
    // so we must strip the "Bearer " prefix before comparing
    const rawAuth = req.headers.get('authorization') || '';
    const cronSecret =
      rawAuth.replace(/^Bearer\s+/i, '').trim() ||
      req.nextUrl.searchParams.get('secret') ||
      '';
    const expectedSecret = process.env.CRON_SECRET || '';

    // Allow: matching cron secret, OR if CRON_SECRET not set (dev/local)
    if (expectedSecret && cronSecret !== expectedSecret) {
      console.warn('[QR Broadcast V2] Unauthorized cron call. Got:', cronSecret?.substring(0, 8) + '...');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();

    const { getWhatsAppBridgeUrl, getWhatsAppBridgeSecret } = await import('@/lib/whatsappBridgeConfig');
    const bridgeUrl = getWhatsAppBridgeUrl();
    const bridgeSecret = getWhatsAppBridgeSecret();

    // Find active schedules — include draft, scheduled, in-progress, paused
    // Draft = newly created and ready to send, Paused = auto-paused (session lost), etc.
    const schedules = await QRBroadcastSchedule.find({
      isActive: true,
      status: { $in: ['draft', 'scheduled', 'in-progress', 'paused'] },
    });

    console.log(`[QR Broadcast V2] Found ${schedules.length} active schedules`);

    if (schedules.length === 0) {
      // Debug: check why no schedules found
      const allCount = await QRBroadcastSchedule.countDocuments({});
      const inactiveCount = await QRBroadcastSchedule.countDocuments({ isActive: false });
      const badStatusCount = await QRBroadcastSchedule.countDocuments({
        isActive: true,
        status: { $nin: ['draft', 'scheduled', 'in-progress', 'paused'] },
      });
      console.log(`[QR Broadcast V2] Debug: Total=${allCount}, Inactive=${inactiveCount}, BadStatus=${badStatusCount}`);
    }

    // ── GLOBAL TIME GUARD: Never send QR messages after 10:30 PM or before 5:00 AM IST ──
    if (!isQRSendAllowed()) {
      console.log('[QR Broadcast V2] ⏰ Outside allowed hours (5:00 AM – 10:30 PM IST). Skipping all schedules.');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        processedSchedules: 0,
        results: [],
        note: 'Outside allowed send window (5:00 AM – 10:30 PM IST)',
      });
    }

    const results: any[] = [];
    for (const schedule of schedules) {
      const result = await processSchedule(schedule, bridgeUrl, bridgeSecret);
      results.push({
        scheduleId: schedule._id,
        scheduleName: schedule.name,
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processedSchedules: results.length,
      results,
      note: '✅ All messages sent with WhatsApp-safe variable gaps (100% human-like)',
    });
  } catch (error) {
    console.error('[QR Broadcast V2] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
