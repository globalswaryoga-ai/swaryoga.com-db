import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';
import { getRandomDelay, getRandomBatchSize, shuffleArray } from '@/lib/whatsappRateLimiter';

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
 * Send message with anti-ban protection (random delays)
 */
async function sendMessageWithRateLimit(
  chatId: string,
  messageText: string,
  bridgeUrl: string,
  bridgeSecret: string
): Promise<{ success: boolean; error?: string }> {
  try {
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

    if (!response.ok) {
      throw new Error(`Bridge returned ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a single schedule
 */
async function processSchedule(schedule: any, bridgeUrl: string, bridgeSecret: string) {
  console.log(`[QR Broadcast Processor] Processing schedule: ${schedule._id}`);

  try {
    // Check time window
    if (!isWithinTimeWindow(schedule.startTime, schedule.endTime, schedule.timezone)) {
      console.log(`[QR Broadcast Processor] Schedule ${schedule._id} outside time window`);
      return { status: 'skipped', reason: 'outside_time_window' };
    }

    // Check if schedule should run today
    if (!shouldRunToday(schedule.frequency, schedule.daysOfWeek)) {
      console.log(`[QR Broadcast Processor] Schedule ${schedule._id} not scheduled for today`);
      return { status: 'skipped', reason: 'not_scheduled_for_today' };
    }

    // Check if already ran today
    const lastRunDate = schedule.lastRunDate ? new Date(schedule.lastRunDate) : null;
    const today = new Date();
    if (lastRunDate && lastRunDate.toDateString() === today.toDateString()) {
      console.log(`[QR Broadcast Processor] Schedule ${schedule._id} already ran today`);
      return { status: 'skipped', reason: 'already_ran_today' };
    }

    // Prepare recipients
    let recipients = [...schedule.recipientChatIds];
    const maxMessages = schedule.maxMessagesPerDay;

    // Enforce daily limit
    if (recipients.length > maxMessages) {
      recipients = recipients.slice(0, maxMessages);
      console.log(
        `[QR Broadcast Processor] Limiting recipients to ${maxMessages} (was ${schedule.recipientChatIds.length})`
      );
    }

    // Randomize order if enabled
    if (schedule.randomization?.shuffleRecipients) {
      recipients = shuffleArray(recipients);
    }

    let sent = 0;
    let failed = 0;

    // Send with rate limiting
    const rateLimiting = schedule.rateLimiting;
    const batchSize = rateLimiting?.batchSize || 5;
    const batchDelayMs = rateLimiting?.batchDelayMs || 30000;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // Send batch
      for (const chatId of batch) {
        const result = await sendMessageWithRateLimit(
          chatId,
          schedule.messageText,
          bridgeUrl,
          bridgeSecret
        );

        if (result.success) {
          sent++;
        } else {
          failed++;
          console.error(
            `[QR Broadcast Processor] Failed to send to ${chatId}: ${result.error}`
          );
        }

        // Random delay between messages (anti-ban protection)
        if (rateLimiting?.enabled) {
          const minDelayMs = rateLimiting.minDelayMs || 3000;
          const maxDelayMs = rateLimiting.maxDelayMs || 15000;
          const delay = Math.random() * (maxDelayMs - minDelayMs) + minDelayMs;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Delay between batches (except last batch)
      if (i + batchSize < recipients.length && rateLimiting?.enabled) {
        const delay = batchDelayMs + (Math.random() * batchDelayMs * 0.2 - batchDelayMs * 0.1);
        console.log(`[QR Broadcast Processor] Waiting ${(delay / 1000).toFixed(1)}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

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
      }
    );

    console.log(
      `[QR Broadcast Processor] Schedule ${schedule._id} completed: ${sent} sent, ${failed} failed`
    );

    return { status: 'completed', sent, failed, total: recipients.length };
  } catch (error) {
    console.error(`[QR Broadcast Processor] Error processing schedule ${schedule._id}:`, error);

    // Update error status
    const QRBroadcastSchedule = (await connectDB(), (await import('@/lib/schemas/enterpriseSchemas')).getQRBroadcastSchedule());
    await QRBroadcastSchedule.updateOne(
      { _id: schedule._id },
      {
        status: 'failed',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastErrorAt: new Date(),
        'stats.totalFailed': (schedule.stats?.totalFailed || 0) + 1,
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

    // Get bridge config
    const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

    // Find active schedules
    const schedules = await QRBroadcastSchedule.find({
      isActive: true,
      status: { $in: ['scheduled', 'in-progress'] },
    });

    console.log(`[QR Broadcast Processor] Found ${schedules.length} active schedules`);

    const results = [];
    for (const schedule of schedules) {
      const result = await processSchedule(schedule, bridgeUrl, bridgeSecret);
      results.push({ scheduleId: schedule._id, ...result });
    }

    return NextResponse.json({
      success: true,
      processedSchedules: results.length,
      results,
    });
  } catch (error) {
    console.error('[QR Broadcast Processor] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
