/**
 * Sadhana Scheduler Service V2 - WITH OBS VIDEO PLAYBACK
 * Runs every minute and checks if any Sadhana sessions should start
 * USES OBS FOR REAL VIDEO PLAYBACK (not just chat links)
 */

import mongoose from 'mongoose';
import {
  sendMessageToMeeting,
  autoCloseMeeting,
} from '@/lib/zoomBotServiceSimple';
import {
  validateVideoSource,
  getPlaybackStatus,
} from '@/lib/obsControlServiceV2';
import {
  sendBatchReminders,
} from '@/lib/sadhanaReminderService';
import {
  startSadhanaBot,
  isBotApiConfigured,
} from '@/lib/crm/zoomMeetingSdkBot';

let schedulerRunning = false;
let schedulerInterval: any = null;
const SCHEDULER_INTERVAL = 60 * 1000; // Check every 60 seconds

interface SadhanaSchedule {
  _id: string;
  name: string;
  botName?: string;
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
  // Participant contact information (1-299 each)
  participantEmails?: string[]; // Min: 1, Max: 299
  participantPhones?: string[]; // Min: 1, Max: 299 (WhatsApp numbers)
  enableEmailReminders?: boolean; // Send email 30 & 15 min before
  enableWhatsAppReminders?: boolean; // Send WhatsApp 30 & 15 min before
  whatsappProvider?: 'qr' | 'meta' | 'both'; // QR = QR WhatsApp Bridge, Meta = Meta Business API, both = try both
}

/**
 * Extract Zoom meeting ID from link or zoomId field
 */
function extractZoomMeetingId(schedule: SadhanaSchedule): string | null {
  if (schedule.zoomId) return schedule.zoomId;

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
 * Check if current time matches a scheduled time (Robust Version)
 */
function shouldTrigger(
  schedule: SadhanaSchedule,
  now: Date,
  timezone: string,
  offsetMinutes: number = 0
): boolean {
  const times = schedule.schedule.times || [];
  const days = schedule.schedule.days || [];

  try {
    // Use robust Intl.DateTimeFormat for timezone handling
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = dtf.formatToParts(now);
    const timeMap: { [key: string]: string } = {};

    parts.forEach(part => {
      if (part.type !== 'literal') {
        timeMap[part.type] = part.value;
      }
    });

    const currentHour = parseInt(timeMap.hour || '0', 10);
    const currentMin = parseInt(timeMap.minute || '0', 10);
    const currentTotalMin = currentHour * 60 + currentMin;

    // Get day of week
    const utcDate = new Date(now.toLocaleString('sv-SE', { timeZone: timezone }));
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
  } catch (err) {
    console.error(`[SadhanaScheduler] ❌ Timezone calculation error:`, err);
    return false;
  }
}

/**
 * Execute bot actions for a schedule - WITH OBS VIDEO PLAYBACK
 */
async function executeBotActions(schedule: SadhanaSchedule): Promise<void> {
  try {
    const meetingId = extractZoomMeetingId(schedule);
    const password = extractZoomPassword(schedule);
    const videoDuration = schedule.videoDuration || 40;
    const videoUrl = schedule.videoUrl;

    if (!meetingId) {
      console.error(`[SadhanaScheduler] ❌ No Zoom meeting ID found for "${schedule.name}"`);
      return;
    }

    const validation = validateVideoSource(videoUrl);
    if (!validation.valid) {
      console.error(`[SadhanaScheduler] ❌ Video source invalid: ${videoUrl}`, validation);
      return;
    }

    if (!isBotApiConfigured()) {
      console.error('[SadhanaScheduler] ❌ Sadhana bot API not configured (missing ZOOM_SDK_KEY/SECRET or SADHANA_BOT_API_URL/SECRET)');
      return;
    }

    console.log(`[SadhanaScheduler] 🚀 Starting Sadhana Zoom bot: "${schedule.name}" (Meeting: ${meetingId})`);

    // The bot (a real Zoom Meeting SDK client running on a dedicated VPS)
    // joins the meeting itself, posts the chat message once in, plays the
    // video with audio via the SDK's raw-data APIs, and leaves on its own
    // after videoDuration minutes — see lib/crm/zoomMeetingSdkBot.ts.
    const result = await startSadhanaBot({
      meetingNumber: meetingId,
      meetingPassword: password || '',
      botName: schedule.botName || 'Swar Sadhana',
      videoUrl,
      chatMessage: `🧘 **SADHANA SESSION STARTING NOW** 🧘\n⏱️ Duration: ${videoDuration} minutes\nPlease be ready! Namaste 🙏`,
      durationMinutes: videoDuration,
    });

    if (!result.success) {
      console.error(`[SadhanaScheduler] ❌ Bot failed to start: ${result.error}`);
      return;
    }

    console.log(`[SadhanaScheduler] ✅✅✅ Bot joined and is playing the Sadhana video (pid ${result.pid})`);

    // Bot leaves on its own after videoDuration minutes; end the meeting
    // for everyone shortly after, with a buffer so it isn't cut off early.
    const closeDelayMs = (videoDuration + 2) * 60 * 1000;
    const closeTimeout = setTimeout(async () => {
      try {
        console.log(`[SadhanaScheduler] 🛑 Auto-closing meeting after video...`);
        await autoCloseMeeting({ meetingId, meetingPassword: password || undefined, videoDurationMinutes: videoDuration });
        console.log(`[SadhanaScheduler] ✅ Meeting closed - Sadhana session complete!`);
      } catch (err) {
        console.error(`[SadhanaScheduler] ❌ Error during auto-close:`, err);
      }
    }, closeDelayMs);

    (global as any).sadhanaCloseTimeout = closeTimeout;
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

  console.log('[SadhanaScheduler] 🚀 Starting Sadhana scheduler with OBS VIDEO SUPPORT...');
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

      console.log(
        `[SadhanaScheduler] ⏰ Scheduler check at ${now.toISOString()}`
      );

      // Get all active Sadhana schedules
      const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
      const SadhanaSchedule =
        db.models.SadhanaSchedule ||
        db.model(
          'SadhanaSchedule',
          new mongoose.Schema(
            {
              name: String,
              botName: String,
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
              participantEmails: [String], // Max 299 emails
              participantPhones: [String], // Max 299 WhatsApp numbers
              enableEmailReminders: Boolean,
              enableWhatsAppReminders: Boolean,
              whatsappProvider: { type: String, enum: ['qr', 'meta', 'both'], default: 'qr' },
            },
            { collection: 'sadhana_schedules' }
          )
        );

      const schedules = await SadhanaSchedule.find({
        status: 'active',
        enableBotAutomation: { $ne: false },
      });

      console.log(`[SadhanaScheduler] 📋 Found ${schedules.length} active schedule(s)`);

      for (const schedule of schedules) {
        const timezone = schedule.schedule.timezone || 'Asia/Kolkata';

        // ============================================
        // BOT JOIN MEETING (5 minutes before)
        // ============================================
        const botJoinMinutes = schedule.botJoinMinutes || 5;
        const botId = `${schedule._id}_bot_join`;

        if (shouldTrigger(schedule, now, timezone, -botJoinMinutes) && !triggeredSchedules.has(botId)) {
          const meetingId = extractZoomMeetingId(schedule);
          if (meetingId) {
            console.log(`[SadhanaScheduler] 🤖 BOT JOINING in ${botJoinMinutes} minutes: "${schedule.name}"`);
            triggeredSchedules.add(botId);

            try {
              // Bot joins and sends ready message
              await sendMessageToMeeting(
                meetingId,
                `🟢 **SADHANA BOT ONLINE** 🟢\n\nSession starting in ${botJoinMinutes} minutes!\n\n📍 ${schedule.name}\n⏱️ Duration: ${schedule.videoDuration || 40} min\n🎥 Video: Ready\n\nNameste 🙏`
              );
              console.log(`[SadhanaScheduler] ✅ Bot joined successfully - ready message sent`);
            } catch (err) {
              console.error(`[SadhanaScheduler] ❌ Bot join failed:`, err);
            }
          }
        }

        // ============================================
        // SEND REMINDERS (30 & 15 minutes before)
        // ============================================
        const reminderId = `${schedule._id}_remind`;

        // 30 minutes before
        if (shouldTrigger(schedule, now, timezone, -30) && !triggeredSchedules.has(`${reminderId}_30`)) {
          console.log(`[SadhanaScheduler] 📧 Sending 30-minute reminder for: ${schedule.name}`);
          triggeredSchedules.add(`${reminderId}_30`);

          try {
            if (schedule.enableEmailReminders && schedule.participantEmails?.length > 0) {
              await sendBatchReminders({
                programName: schedule.name,
                startTime: new Date(now.getTime() + 30 * 60 * 1000),
                zoomLink: schedule.zoomLink || '',
                videoDuration: schedule.videoDuration || 40,
                participantEmails: schedule.participantEmails,
              }).catch(err => console.warn('[SadhanaScheduler] Email reminder failed:', err));
            }
            if (schedule.enableWhatsAppReminders && schedule.participantPhones?.length > 0) {
              // WhatsApp sent at 15 min (see below)
            }
          } catch (err) {
            console.warn('[SadhanaScheduler] Reminder error:', err);
          }
        }

        // 15 minutes before
        if (shouldTrigger(schedule, now, timezone, -15) && !triggeredSchedules.has(`${reminderId}_15`)) {
          console.log(`[SadhanaScheduler] 💬 Sending 15-minute reminder for: ${schedule.name}`);
          triggeredSchedules.add(`${reminderId}_15`);

          try {
            if (schedule.enableWhatsAppReminders && schedule.participantPhones?.length > 0) {
              await sendBatchReminders({
                programName: schedule.name,
                startTime: new Date(now.getTime() + 15 * 60 * 1000),
                zoomLink: schedule.zoomLink || '',
                videoDuration: schedule.videoDuration || 40,
                participantPhones: schedule.participantPhones,
              }).catch(err => console.warn('[SadhanaScheduler] WhatsApp reminder failed:', err));
            }
          } catch (err) {
            console.warn('[SadhanaScheduler] Reminder error:', err);
          }
        }

        // ============================================
        // TRIGGER BOT ACTIONS (at scheduled time)
        // ============================================
        if (shouldTrigger(schedule, now, timezone, 0)) {
          if (!triggeredSchedules.has(schedule._id.toString())) {
            console.log(
              `[SadhanaScheduler] 📌 TRIGGERING: ${schedule.name} at ${now.toISOString()}`
            );
            triggeredSchedules.add(schedule._id.toString());

            // Execute bot actions (don't await - run in background)
            executeBotActions(schedule).catch(err => {
              console.error(
                `[SadhanaScheduler] ❌ Error executing ${schedule.name}:`,
                err
              );
            });
          }
        }
      }

      // Clear triggered set every hour
      if (currentMinute % 60 === 0) {
        triggeredSchedules.clear();
        console.log('[SadhanaScheduler] 🔄 Cleared triggered schedules cache');
      }
    } catch (err) {
      console.error('[SadhanaScheduler] ❌ Error in scheduler loop:', err);
    }
  }, SCHEDULER_INTERVAL);

  console.log('[SadhanaScheduler] ✅ Scheduler started - checking every 60 seconds');
  console.log('[SadhanaScheduler] 🎬 OBS video playback enabled for all schedules');
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
  videoPlayback: any;
} {
  const videoStatus = getPlaybackStatus();

  return {
    running: schedulerRunning,
    interval: SCHEDULER_INTERVAL,
    videoPlayback: videoStatus,
  };
}

export default {
  startSadhanaScheduler,
  stopSadhanaScheduler,
  getSadhanaSchedulerStatus,
};
