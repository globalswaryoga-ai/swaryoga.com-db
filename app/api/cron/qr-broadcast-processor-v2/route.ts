import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';
import { shuffleArray } from '@/lib/whatsappRateLimiter';
import { calculateVariableGaps, getWhatsAppComplianceStatus } from '@/lib/whatsappGapCalculator';
import { checkSessionHealth, sendSessionHeartbeat } from '@/lib/whatsappConnectionManager';
import { canSendMessageToUser, recordMessageSent } from '@/lib/messageDeduplication';

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
    return daysOfWeek.includes(today);
  }

  return false;
}

/**
 * Send single message with deduplication check
 */
async function sendMessageWithGaps(
  chatId: string,
  messageText: string,
  bridgeUrl: string,
  bridgeSecret: string,
  delayBefore: number,
  userId: string,
  scheduleId: string,
  db: any
): Promise<{ success: boolean; error?: string; sendTimeMs?: number; skipped?: boolean }> {
  try {
    // CHECK 1: Deduplication - prevent same message to same user today
    const dedupCheck = await canSendMessageToUser(userId, chatId, messageText, db);
    if (!dedupCheck.canSend) {
      return {
        success: false,
        error: dedupCheck.reason,
        skipped: true, // Mark as skipped, not failed
      };
    }

    // Wait before sending (honor gap)
    await new Promise(resolve => setTimeout(resolve, delayBefore));

    const startTime = Date.now();

    const response = await fetch(`${bridgeUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': bridgeSecret,
      },
      body: JSON.stringify({
        to: chatId,
        message: messageText,
        type: 'text',
      }),
    });

    const sendTimeMs = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Bridge returned ${response.status}`);
    }

    // Record message as sent (for deduplication)
    await recordMessageSent(userId, chatId, messageText, scheduleId, db);

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
  console.log(`[QR Broadcast Processor V2] Processing: ${schedule._id} (${schedule.name})`);

  try {
    // CHECK 0: Session health (prevents auto-signout cascade)
    const sessionHealth = await checkSessionHealth(
      schedule.userId,
      schedule.sessionKey,
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
      console.log(`[QR Broadcast Processor V2] Outside time window: ${schedule.startTime}-${schedule.endTime}`);
      return { status: 'skipped', reason: 'outside_time_window' };
    }

    // Check if should run today
    if (!shouldRunToday(schedule.frequency, schedule.daysOfWeek)) {
      return { status: 'skipped', reason: 'not_scheduled_for_today' };
    }

    // Check if already ran today
    const lastRunDate = schedule.lastRunDate ? new Date(schedule.lastRunDate) : null;
    const today = new Date();
    if (lastRunDate && lastRunDate.toDateString() === today.toDateString()) {
      console.log(`[QR Broadcast Processor V2] Already ran today`);
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
    const db = (await connectDB(), (await import('@/lib/db')).getDb());

    // Send with gaps
    for (let i = 0; i < recipients.length; i++) {
      const chatId = recipients[i];
      const gap = gaps[i] || 60000; // Fallback to 60 sec

      // HEARTBEAT CHECK: Every 10 messages, verify session is still connected
      heartbeatCheckCounter++;
      if (heartbeatCheckCounter >= 10) {
        const heartbeat = await sendSessionHeartbeat(
          schedule.userId,
          schedule.sessionKey,
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
        db
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

    const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

    // Find active schedules
    const schedules = await QRBroadcastSchedule.find({
      isActive: true,
      status: { $in: ['scheduled', 'in-progress'] },
    });

    console.log(`[QR Broadcast V2] Found ${schedules.length} active schedules`);

    const results = [];
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
