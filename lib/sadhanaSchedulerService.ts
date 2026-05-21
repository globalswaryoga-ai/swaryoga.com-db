/**
 * Sadhana Scheduler Service - Background scheduler to trigger bot actions
 * Runs every minute and checks if any Sadhana sessions should start
 */

import mongoose from 'mongoose';
import {
  botJoinMeeting,
  sendCountdownMessage,
  startVideoInMeeting,
  autoCloseMeeting,
} from '@/lib/zoomBotService';

let schedulerRunning = false;
let schedulerInterval: any = null;
const SCHEDULER_INTERVAL = 60 * 1000; // Check every 60 seconds

interface SadhanaSchedule {
  _id: string;
  name: string;
  videoUrl: string;
  videoDuration?: number;
  botJoinMinutes?: number;
  autoCloseMinutes?: number;
  enableBotAutomation?: boolean;
  zoomLink?: string;
  zoomId?: string;
  zoomPassword?: string;
  schedule: {
    times: string[];
    days: number[];
    timezone: string;
  };
  status: 'active' | 'paused';
}

/**
 * Extract Zoom meeting ID from link or zoomId field
 */
function extractZoomMeetingId(schedule: SadhanaSchedule): string | null {
  // Try zoomId field first
  if (schedule.zoomId) return schedule.zoomId;

  // Try extracting from zoomLink
  if (schedule.zoomLink) {
    const match = schedule.zoomLink.match(/\/j\/(\d+)/);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract Zoom password from link
 */
function extractZoomPassword(schedule: SadhanaSchedule): string | null {
  if (schedule.zoomPassword) return schedule.zoomPassword;

  if (schedule.zoomLink) {
    const match = schedule.zoomLink.match(/[?&]pwd=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

/**
 * Check if current time matches a scheduled time
 */
function shouldTrigger(
  schedule: SadhanaSchedule,
  now: Date,
  timezone: string,
  offsetMinutes: number = 0
): boolean {
  const times = schedule.schedule.times || [];
  const days = schedule.schedule.days || [];

  // Get current time in the schedule's timezone
  const localStr = now.toLocaleString('en-US', {
    timeZone: timezone,
    hour12: false,
  });

  const [datePart, timePart] = localStr.split(', ');
  const [currentHour, currentMin] = timePart.split(':');
  const currentTotalMin = parseInt(currentHour) * 60 + parseInt(currentMin);

  // Get day of week
  const utcDate = new Date(
    now.toLocaleString('sv-SE', { timeZone: timezone })
  );
  const currentDay = utcDate.getDay();

  // Check if today is in scheduled days
  if (!days.includes(currentDay)) {
    return false;
  }

  // Check if current time matches any scheduled time (with offset)
  for (const scheduledTime of times) {
    const [schedHour, schedMin] = scheduledTime.split(':');
    const scheduledTotalMin =
      parseInt(schedHour) * 60 + parseInt(schedMin) + offsetMinutes;

    // Allow 1-minute window for matching
    if (Math.abs(currentTotalMin - scheduledTotalMin) <= 1) {
      return true;
    }
  }

  return false;
}

/**
 * Execute bot actions for a schedule
 */
async function executeBotActions(schedule: SadhanaSchedule): Promise<void> {
  try {
    const meetingId = extractZoomMeetingId(schedule);
    const password = extractZoomPassword(schedule);
    const botJoinMinutes = schedule.botJoinMinutes || 5;
    const videoDuration = schedule.videoDuration || 40;

    if (!meetingId) {
      console.error(
        `[SadhanaScheduler] ❌ No Zoom meeting ID found for "${schedule.name}"`
      );
      return;
    }

    console.log(
      `[SadhanaScheduler] 🚀 Starting Sadhana: "${schedule.name}" (Meeting: ${meetingId})`
    );

    // Step 1: Bot joins and sends ready message
    console.log(
      `[SadhanaScheduler] ⏱️ Step 1: Bot sending ready message to meeting...`
    );
    await botJoinMeeting({
      meetingId,
      meetingPassword: password,
      videoDurationMinutes: videoDuration,
    });

    console.log(`[SadhanaScheduler] ✅ Bot ready message sent`);

    // Step 2: Send countdown message (immediately, appears as timer in chat)
    console.log(`[SadhanaScheduler] ⏰ Step 2: Sending countdown to participants...`);
    await sendCountdownMessage({
      meetingId,
      meetingPassword: password,
      countdownSeconds: 180, // 3 minute countdown
    });

    console.log(`[SadhanaScheduler] ✅ Countdown started`);

    // Step 3: Start video playback (wait 3 minutes)
    console.log(
      `[SadhanaScheduler] ⏳ Step 3: Waiting 3 minutes before playing video...`
    );
    await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000));

    console.log(`[SadhanaScheduler] 🎬 Step 3: Starting video playback...`);
    await startVideoInMeeting({
      meetingId,
      meetingPassword: password,
      videoUrl: schedule.videoUrl,
      videoDurationMinutes: videoDuration,
    });

    console.log(`[SadhanaScheduler] ✅ Video started`);

    // Step 4: Auto-close meeting after video duration
    const closeDelayMs = (videoDuration + 2) * 60 * 1000; // 2 min buffer
    console.log(
      `[SadhanaScheduler] ⏳ Step 4: Will auto-close meeting in ${videoDuration + 2} minutes...`
    );

    setTimeout(async () => {
      try {
        console.log(
          `[SadhanaScheduler] 🛑 Step 4: Auto-closing meeting after video...`
        );
        await autoCloseMeeting({
          meetingId,
          meetingPassword: password,
          videoDurationMinutes: videoDuration,
        });
        console.log(`[SadhanaScheduler] ✅ Meeting closed`);
      } catch (err) {
        console.error(`[SadhanaScheduler] ❌ Error auto-closing meeting:`, err);
      }
    }, closeDelayMs);
  } catch (err) {
    console.error(`[SadhanaScheduler] ❌ Error executing bot actions:`, err);
  }
}

/**
 * Main scheduler loop - runs every minute
 */
async function runSchedulerLoop(): Promise<void> {
  if (schedulerRunning) {
    console.log('[SadhanaScheduler] ℹ️ Scheduler loop already running');
    return;
  }

  console.log('[SadhanaScheduler] 🚀 Starting Sadhana scheduler...');
  schedulerRunning = true;

  // Track which schedules we've already triggered this minute (avoid duplicates)
  let lastCheckMinute = -1;
  const triggeredSchedules = new Set<string>();

  schedulerInterval = setInterval(async () => {
    try {
      // Only check once per minute
      const now = new Date();
      const currentMinute = now.getHours() * 60 + now.getMinutes();

      if (currentMinute === lastCheckMinute) {
        return;
      }
      lastCheckMinute = currentMinute;

      // Get all active Sadhana schedules
      const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
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
            },
            { collection: 'sadhana_schedules' }
          )
        );

      const schedules = await SadhanaSchedule.find({
        status: 'active',
        enableBotAutomation: { $ne: false },
      });

      for (const schedule of schedules) {
        const timezone = schedule.schedule.timezone || 'Asia/Kolkata';

        // Check if bot should join (at scheduled time)
        if (shouldTrigger(schedule, now, timezone, 0)) {
          if (!triggeredSchedules.has(schedule._id.toString())) {
            console.log(
              `[SadhanaScheduler] 📌 Triggering schedule: ${schedule.name}`
            );
            triggeredSchedules.add(schedule._id.toString());
            executeBotActions(schedule);
          }
        }
      }

      // Clear triggered set every hour
      if (currentMinute % 60 === 0) {
        triggeredSchedules.clear();
      }
    } catch (err) {
      console.error('[SadhanaScheduler] ❌ Error in scheduler loop:', err);
    }
  }, SCHEDULER_INTERVAL);

  console.log('[SadhanaScheduler] ✅ Scheduler started - checking every 60 seconds');
}

/**
 * Stop the scheduler
 */
export function stopSadhanaScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    schedulerRunning = false;
    console.log('[SadhanaScheduler] ⏹️ Scheduler stopped');
  }
}

/**
 * Start the scheduler
 */
export async function startSadhanaScheduler(): Promise<void> {
  if (schedulerRunning) {
    console.log('[SadhanaScheduler] ℹ️ Scheduler is already running');
    return;
  }

  try {
    await runSchedulerLoop();
  } catch (err) {
    console.error('[SadhanaScheduler] ❌ Failed to start scheduler:', err);
    throw err;
  }
}

/**
 * Get scheduler status
 */
export function getSadhanaSchedulerStatus(): {
  running: boolean;
  interval: number;
} {
  return {
    running: schedulerRunning,
    interval: SCHEDULER_INTERVAL,
  };
}
