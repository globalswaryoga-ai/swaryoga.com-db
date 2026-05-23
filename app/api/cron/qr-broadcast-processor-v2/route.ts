import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getQRBroadcastSchedule, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { shuffleArray } from '@/lib/whatsappRateLimiter';
import { calculateVariableGaps, getWhatsAppComplianceStatus } from '@/lib/whatsappGapCalculator';
import { checkSessionHealth, sendSessionHeartbeat } from '@/lib/whatsappConnectionManager';
import { reserveMessageSend } from '@/lib/messageDeduplication';
import { isQRSendAllowed } from '@/lib/qrTimeGuard';

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
 */
function shouldRunToday(frequency: string, daysOfWeek: number[]): boolean {
  if (frequency === 'once') return true;
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
    const own = sessions.find(s => s.userId === userId && s.status === 'connected');
    const any = sessions.find(s => s.status === 'connected');
    const s = own || any;
    if (!s) return null;
    return { sessionKey: String(s.sessionKey), tenantId: String(s.tenantId || s.sessionKey) };
  } catch {
    return null;
  }
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
  sessionInfo?: { sessionKey: string; tenantId: string }
): Promise<{ success: boolean; error?: string; sendTimeMs?: number; skipped?: boolean }> {
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
      // Send image with text as caption — send first image, then text if present
      const mediaUrl = mediaUrls![0]; // Use first media URL
      console.log(`[QR Broadcast V2] Sending media: ${mediaUrl} to ${chatId}`);

      const res = await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers: bridgeHeaders,
        body: JSON.stringify({
          to: chatId,
          type: 'image',
          url: mediaUrl,
          message: messageText || ''
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
      // Send text only
      const res = await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers: bridgeHeaders,
        body: JSON.stringify({ to: chatId, type: 'text', message: messageText }),
      });
      const resData = await res.json().catch(() => ({}));
      sendOk = res.ok && resData?.success !== false;
      if (!sendOk) console.warn(`[QR Broadcast V2] Text send failed: ${resData?.error || res.status}`);
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
 * Calculate send time estimate
 */
function estimateSendTime(totalMessages: number, gaps: number[]): string {
  const totalMs = gaps.reduce((a, b) => a + b, 0);
  const totalSec = totalMs / 1000;
  if (totalSec < 60) return `${Math.round(totalSec)}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  return `${mins}m ${secs}s`;
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
    console.log(`[QR Broadcast V2] Session resolved: ${JSON.stringify(sessionInfo)}`);

    const sessionHealth = await checkSessionHealth(
      schedule.userId,
      sessionInfo?.sessionKey || '',
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

    // Check if should run today
    if (!shouldRunToday(schedule.frequency, schedule.daysOfWeek)) {
      const today = new Date();
      console.log(`[QR Broadcast Processor V2] 📅 Not scheduled for today (frequency: ${schedule.frequency}, daysOfWeek: ${schedule.daysOfWeek}, today: ${today.getDay()})`);
      return { status: 'skipped', reason: 'not_scheduled_for_today' };
    }

    // Check if already ran today
    const lastRunDate = schedule.lastRunDate ? new Date(schedule.lastRunDate) : null;
    const today = new Date();
    if (lastRunDate && lastRunDate.toDateString() === today.toDateString()) {
      console.log(`[QR Broadcast Processor V2] ✓ Already ran today at ${lastRunDate.toLocaleTimeString()}`);
      return { status: 'skipped', reason: 'already_ran_today' };
    }

    // Prepare recipients
    let recipients = [...schedule.recipientChatIds];
    const maxMessages = schedule.maxMessagesPerDay;

    // Enforce daily limit
    if (recipients.length > maxMessages) {
      recipients = recipients.slice(0, maxMessages);
      console.log(`[QR Broadcast Processor V2] Limited to ${maxMessages} recipients`);
    }

    // Shuffle recipients (100% human randomization)
    recipients = shuffleArray(recipients);

    // Get gap strategy
    const gapStrategy = schedule.gapStrategy || {
      initialGapMs: 7000,
      initialGapCount: 2,
      minGapMs: 45000,
      maxGapMs: 120000,
      ensureVariation: true,
      ensureJitter: true,
      jitterPercent: 15,
    };

    // Calculate variable gaps (no repeated values)
    const gaps = calculateVariableGaps(recipients.length, {
      ...gapStrategy,
      batchSize: gapStrategy.batchSize || 5,
      batchGapMs: gapStrategy.batchGapMs || 30000,
      totalMessagesPerHour: 60, // Target
    });

    // Check WhatsApp compliance
    const compliance = getWhatsAppComplianceStatus(recipients.length, 1);
    console.log(`[QR Broadcast Processor V2] Compliance: ${compliance.riskLevel}`);
    console.log(`[QR Broadcast Processor V2] ${compliance.recommendation}`);

    // Estimate time
    const estimatedTime = estimateSendTime(recipients.length, gaps);
    console.log(`[QR Broadcast Processor V2] Estimated send time: ${estimatedTime}`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let totalSendTimeMs = 0;
    let heartbeatCheckCounter = 0;

    // Get database for deduplication
    const db = mongoose.connection.db;

    // Send with gaps
    for (let i = 0; i < recipients.length; i++) {
      const chatId = recipients[i];
      const gap = gaps[i] || 60000; // Fallback to 60 sec

      // HEARTBEAT CHECK: Every 10 messages, verify session is still connected
      heartbeatCheckCounter++;
      if (heartbeatCheckCounter >= 10) {
        const heartbeat = await sendSessionHeartbeat(
          schedule.userId,
          sessionInfo?.sessionKey || '',
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
        sessionInfo || undefined  // passes both sessionKey + tenantId
      );

      if (result.skipped) {
        skipped++;
        console.log(
          `[QR Broadcast V2] ⊘ ${i + 1}/${recipients.length} skipped: ${result.error} (already sent today)`
        );
      } else if (result.success) {
        sent++;
        totalSendTimeMs += (result.sendTimeMs || 0);
        console.log(
          `[QR Broadcast V2] ✓ ${i + 1}/${recipients.length} sent (gap: ${(gap / 1000).toFixed(1)}s)`
        );
        // Save to WhatsAppMessage (main DB, not CRM DB) so stats page shows real data
        try {
          const mainDb = mongoose.connection.db;
          const waCollection = mainDb.collection('whatsapp_messages');
          const phoneNum = chatId.includes('@') ? chatId.split('@')[0] : chatId.replace(/\D/g, '');
          await waCollection.insertOne({
            phoneNumber: phoneNum,
            direction: 'outbound',
            messageContent: schedule.messageText || '[media]',
            messageType: (schedule.mediaUrls?.length > 0) ? 'media' : 'text',
            media: schedule.mediaUrls?.length > 0 ? { kind: 'image', url: schedule.mediaUrls[0] } : undefined,
            status: 'sent',
            sentByUserId: schedule.userId,
            sentByLabel: schedule.userId,
            provider: 'whatsapp_web_bridge',
            sentAt: new Date(),
            recipientType: chatId.endsWith('@g.us') ? 'group' : 'individual',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (waErr) {
          console.warn(`[QR Broadcast V2] Warning: Failed to save message to WhatsAppMessage:`, waErr instanceof Error ? waErr.message : String(waErr));
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

    // Update schedule stats
    const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());

    await QRBroadcastSchedule.updateOne(
      { _id: schedule._id },
      {
        lastRunDate: new Date(),
        status: failed === recipients.length ? 'failed' : 'completed',
        'stats.totalAttempted': (schedule.stats?.totalAttempted || 0) + recipients.length,
        'stats.totalSent': (schedule.stats?.totalSent || 0) + sent,
        'stats.totalFailed': (schedule.stats?.totalFailed || 0) + failed,
        'stats.totalSkipped': (schedule.stats?.totalSkipped || 0) + skipped,
        'stats.averageDeliveryTimeMs': avgSendTimeMs,
      }
    );

    console.log(`[QR Broadcast V2] ✅ Complete: ${sent} sent, ${skipped} skipped (duplicate), ${failed} failed (Avg: ${avgSendTimeMs}ms)`);

    return {
      status: 'completed',
      sent,
      skipped,
      failed,
      total: recipients.length,
      successRate: `${Math.round((sent / (sent + failed)) * 100)}%`,
      deduplicateRate: `${Math.round((skipped / recipients.length) * 100)}%`,
      averageSendTimeMs: avgSendTimeMs,
      compliance: compliance.riskLevel,
    };
  } catch (error) {
    console.error(`[QR Broadcast V2] Error:`, error);

    const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());
    await QRBroadcastSchedule.updateOne(
      { _id: schedule._id },
      {
        status: 'failed',
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
    // Verify cron secret
    const cronSecret = req.headers.get('authorization') || req.nextUrl.searchParams.get('secret');
    if (cronSecret !== process.env.CRON_SECRET) {
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
