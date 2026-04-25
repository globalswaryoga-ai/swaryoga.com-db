import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import {
  botJoinMeeting,
  sendCountdownMessage,
  startVideoInMeeting,
  autoCloseMeeting,
} from '@/lib/zoomBotService';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/sadhana-scheduler/check
 * Scheduled endpoint - call every 60 seconds via cron
 * Checks if any Sadhana sessions should start and triggers bot actions
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (can add secret token verification)
    const secret = request.headers.get('x-cron-secret');
    const envSecret = process.env.CRON_SECRET;

    if (envSecret && secret !== envSecret) {
      console.log('[Sadhana Check] ❌ Unauthorized cron call');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    console.log(`[Sadhana Check] ⏰ Running scheduler check at ${now.toISOString()}`);

    // Get all active Sadhana schedules
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    const SadhanaSchedule =
      db.models.SadhanaSchedule ||
      db.model(
        'SadhanaSchedule',
        new mongoose.Schema(
          {
            name: String,
            videoUrl: String,
            videoDuration: Number,
            botJoinMinutes: Number,
            autoCloseMinutes: Number,
            enableBotAutomation: Boolean,
            zoomLink: String,
            zoomId: String,
            zoomPassword: String,
            schedule: {
              times: [String],
              days: [Number],
              timezone: String,
            },
            status: String,
            lastTriggered: Date,
          },
          { collection: 'sadhana_schedules' }
        )
      );

    const schedules = await SadhanaSchedule.find({
      status: 'active',
      enableBotAutomation: { $ne: false },
    });

    let triggered = 0;

    for (const schedule of schedules) {
      const timezone = schedule.schedule.timezone || 'Asia/Kolkata';
      const times = schedule.schedule.times || [];
      const days = schedule.schedule.days || [];

      // Get current time in schedule's timezone
      const localStr = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour12: false,
      });

      const [datePart, timePart] = localStr.split(', ');
      const [currentHour, currentMin] = timePart.split(':');
      const currentTotalMin = parseInt(currentHour) * 60 + parseInt(currentMin);

      // Get day of week
      const utcDate = new Date(now.toLocaleString('sv-SE', { timeZone: timezone }));
      const currentDay = utcDate.getDay();

      // Check if today is scheduled
      if (!days.includes(currentDay)) {
        continue;
      }

      // Check if any scheduled time matches (within 1 minute window)
      let shouldTrigger = false;
      for (const scheduledTime of times) {
        const [h, m] = scheduledTime.split(':');
        const scheduledTotalMin = parseInt(h) * 60 + parseInt(m);
        if (Math.abs(currentTotalMin - scheduledTotalMin) <= 1) {
          shouldTrigger = true;
          break;
        }
      }

      if (!shouldTrigger) {
        continue;
      }

      // Check if already triggered recently (avoid duplicates)
      const lastTriggered = schedule.lastTriggered ? new Date(schedule.lastTriggered) : null;
      const minutesSinceLastTrigger = lastTriggered
        ? Math.floor((now.getTime() - lastTriggered.getTime()) / 60000)
        : 1000;

      if (minutesSinceLastTrigger < 5) {
        console.log(
          `[Sadhana Check] ⏭️ Skipping "${schedule.name}" - triggered ${minutesSinceLastTrigger} min ago`
        );
        continue;
      }

      // Extract Zoom details
      let meetingId = schedule.zoomId;
      let password = schedule.zoomPassword;

      if (!meetingId && schedule.zoomLink) {
        const match = schedule.zoomLink.match(/\/j\/(\d+)/);
        if (match) meetingId = match[1];

        if (!password) {
          const pwdMatch = schedule.zoomLink.match(/[?&]pwd=([^&]+)/);
          if (pwdMatch) password = decodeURIComponent(pwdMatch[1]);
        }
      }

      if (!meetingId) {
        console.error(
          `[Sadhana Check] ❌ No meeting ID for "${schedule.name}"`
        );
        continue;
      }

      // Update lastTriggered timestamp
      await SadhanaSchedule.updateOne(
        { _id: schedule._id },
        { lastTriggered: now }
      );

      // Execute bot actions (async, don't wait)
      triggered++;
      console.log(`[Sadhana Check] 🚀 Triggering: "${schedule.name}" (${meetingId})`);

      executeBotActionsAsync(schedule, meetingId, password).catch((err) => {
        console.error(
          `[Sadhana Check] ❌ Error executing actions for "${schedule.name}":`,
          err
        );
      });
    }

    return NextResponse.json({
      success: true,
      message: `Scheduler check complete - triggered ${triggered} sadhana session(s)`,
      timestamp: now.toISOString(),
      triggered,
    });
  } catch (err: any) {
    console.error('[Sadhana Check] ❌ Error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Scheduler check failed' },
      { status: 500 }
    );
  }
}

/**
 * Execute bot actions asynchronously
 */
async function executeBotActionsAsync(
  schedule: any,
  meetingId: string,
  password: string
): Promise<void> {
  try {
    const videoDuration = schedule.videoDuration || 40;

    // Step 1: Bot joins
    console.log(`[Sadhana Action] 🤖 Bot joining meeting ${meetingId}...`);
    await botJoinMeeting({
      meetingId,
      meetingPassword: password,
      videoDurationMinutes: videoDuration,
    });
    console.log(`[Sadhana Action] ✅ Bot joined and sent ready message`);

    // Step 2: Send countdown
    console.log(`[Sadhana Action] ⏰ Sending 3-minute countdown...`);
    await sendCountdownMessage(meetingId, 3);
    console.log(`[Sadhana Action] ✅ Countdown sent`);

    // Step 3: Wait 3 minutes then start video
    await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000));

    console.log(`[Sadhana Action] 🎬 Starting video playback...`);
    await startVideoInMeeting(meetingId, schedule.videoUrl);
    console.log(`[Sadhana Action] ✅ Video started`);

    // Step 4: Schedule auto-close
    const closeDelayMs = (videoDuration + 2) * 60 * 1000;
    setTimeout(async () => {
      try {
        console.log(`[Sadhana Action] 🛑 Auto-closing meeting...`);
        await autoCloseMeeting(meetingId);
        console.log(`[Sadhana Action] ✅ Meeting closed`);
      } catch (err) {
        console.error(`[Sadhana Action] ❌ Error closing meeting:`, err);
      }
    }, closeDelayMs);
  } catch (err) {
    console.error('[Sadhana Action] ❌ Error in bot actions:', err);
    throw err;
  }
}
