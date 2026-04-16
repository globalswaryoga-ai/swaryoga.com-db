import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { sendWhatsAppText } from '@/lib/whatsapp';
import {
  botJoinMeeting,
  sendCountdownMessage,
  startLiveStream,
  startVideoInMeeting,
  autoCloseMeeting,
  cleanupOldMeetings,
  getZoomAccessToken,
} from '@/lib/zoomBotService';
import mongoose from 'mongoose';

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

const sadhanaScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    botName: { type: String, default: 'Swar Sadhana' }, // Name shown in Zoom meeting
    videoUrl: { type: String, required: true },
    videoDuration: { type: Number, default: 40 }, // Minutes (for auto-close)
    botJoinMinutes: { type: Number, default: 5 }, // How many minutes before scheduled time bot joins
    autoCloseMinutes: { type: Number, default: 40 }, // Minutes after start before auto-close
    zoomLink: { type: String },
    zoomId: { type: String },
    zoomPassword: { type: String },
    zoomMeetingId: { type: String }, // Current meeting ID if created
    botJoinTime: { type: String, default: '10:12' }, // When bot joins (HH:MM) - deprecated
    enableBotAutomation: { type: Boolean, default: true }, // Enable bot join/countdown/close
    schedule: {
      times: [String],
      days: [Number],
      repeatFrequency: String,
      startDate: String,
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    status: { type: String, default: 'active' },
    userId: String,
    tenantId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'sadhana_schedules' }
);

async function getSadhanaScheduleModel() {
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  return db.models.SadhanaSchedule || db.model('SadhanaSchedule', sadhanaScheduleSchema);
}

/**
 * Extract Zoom meeting ID and password from Zoom link
 */
function extractZoomDetailsFromLink(zoomLink: string): { meetingId?: string; password?: string } {
  if (!zoomLink) return {};
  
  const urlMatch = zoomLink.match(/\/j\/(\d+)/);
  const pwdMatch = zoomLink.match(/[?&]pwd=([^&]+)/);
  
  return {
    meetingId: urlMatch ? urlMatch[1] : undefined,
    password: pwdMatch ? decodeURIComponent(pwdMatch[1]) : undefined,
  };
}

/**
 * Check if we should trigger bot actions and if we're on the right day
 */
function shouldTriggerBotActions(scheduleItem: any, now: Date, timezone: string): { shouldJoin: boolean; shouldCountdown: boolean; shouldPlay: boolean; isRightDay: boolean } {
  const times = scheduleItem.schedule.times || [];
  const days = scheduleItem.schedule.days || [];

  // Get current time in the schedule's timezone
  const offsetMs = timezone === 'Asia/Kolkata' ? 5.5 * 60 * 60 * 1000 : 0;
  const tzDate = new Date(now.getTime() + offsetMs);
  
  const currentDay = tzDate.getDay();
  const currentHour = String(tzDate.getHours()).padStart(2, '0');
  const currentMin = String(tzDate.getMinutes()).padStart(2, '0');
  const currentTotalMin = parseInt(currentHour) * 60 + parseInt(currentMin);

  console.log(`[Sadhana] ⏰ Current time check: Day=${currentDay}, Time=${currentHour}:${currentMin} (${currentTotalMin}min), Scheduled days=[${days}], times=[${times}]`);

  // Check if today is in scheduled days (0=Sunday, 5=Friday, etc)
  const isRightDay = days.includes(currentDay);
  if (!isRightDay) {
    return { shouldJoin: false, shouldCountdown: false, shouldPlay: false, isRightDay: false };
  }

  let shouldJoin = false;
  let shouldCountdown = false;
  let shouldPlay = false;

  // Check each scheduled time
  for (const time of times) {
    const [schedHour, schedMin] = time.split(':');
    const schedTotalMin = parseInt(schedHour) * 60 + parseInt(schedMin);
    
    const botJoinMinutes = scheduleItem.botJoinMinutes || 5; // Default 5 minutes before
    const botJoinStartTime = schedTotalMin - botJoinMinutes; // Join window starts N min early
    const countdownStartTime = schedTotalMin - 2; // Countdown starts 2 min before

    console.log(`[Sadhana] Checking time: scheduled=${time} (${schedTotalMin}min), current=${currentTotalMin}min, joinStart=${botJoinStartTime}, countdownStart=${countdownStartTime}`);

    // Bot join between (scheduled - N min) and (scheduled - 2 min) - exclusive
    // Only join if we're in the window before countdown starts
    if (currentTotalMin >= botJoinStartTime && currentTotalMin < countdownStartTime) {
      console.log(`[Sadhana] ✅ BOT JOIN WINDOW MATCHED: ${botJoinStartTime} <= ${currentTotalMin} < ${countdownStartTime}`);
      shouldJoin = true;
    }

    // Send countdown between (scheduled - 2 min) and scheduled time (inclusive)
    if (currentTotalMin >= countdownStartTime && currentTotalMin <= schedTotalMin) {
      console.log(`[Sadhana] ✅ COUNTDOWN WINDOW MATCHED: ${countdownStartTime} <= ${currentTotalMin} <= ${schedTotalMin}`);
      shouldCountdown = true;
    }

    // Play video at exact scheduled time (within 1 min window)
    if (currentTotalMin >= schedTotalMin && currentTotalMin < schedTotalMin + 1) {
      console.log(`[Sadhana] ✅ VIDEO PLAY WINDOW MATCHED: ${schedTotalMin} <= ${currentTotalMin} < ${schedTotalMin + 1}`);
      shouldPlay = true;
    }
  }

  return { shouldJoin, shouldCountdown, shouldPlay, isRightDay };
}

/**
 * Send countdown message to Zoom meeting chat
 */
async function sendZoomCountdownMessage(meetingId: string, secondsLeft: number): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const countdownText = `⏳ Video starting in ${mins}:${String(secs).padStart(2, '0')}...`;

    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: countdownText,
      }),
    });
  } catch (err) {
    console.error('Zoom countdown error:', err);
    // Don't throw - non-critical
  }
}

/**
 * Send started message to Zoom meeting chat
 */
async function sendZoomStartedMessage(meetingId: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    const startedText = `🎬 VIDEO PLAYING NOW! Swar Sadhana 🚀`;

    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: startedText,
      }),
    });
  } catch (err) {
    console.error('Zoom started message error:', err);
    // Don't throw - non-critical
  }
}

/**
 * Send video link to Zoom chat (native support for video playback in Zoom)
 */
async function startZoomLiveStream(meetingId: string, videoUrl: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    console.log(`[Zoom] Sending video link to meeting ${meetingId}`);

    // Send prominent video link message - participants can click to open in browser
    const videoMessage = `
🎬 **SWAR SADHANA VIDEO IS LIVE** 🎬

🔗 📲 WATCH VIDEO: ${videoUrl}

Click the link above to stream video in your browser ▶️
Enjoy your Swar Sadhana practice! 🙏
    `.trim();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: videoMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`⚠️ Video message send warning: ${error}`);
      // Don't throw - message delivery is best-effort
    } else {
      console.log(`[Zoom] Video message sent to meeting successfully`);
    }
  } catch (err) {
    console.warn('⚠️ Video message send failed (non-critical):', err);
    // Don't re-throw - video link in schedule is still accessible
  }
}

/**
 * End/Close Zoom meeting
 */
async function endZoomMeeting(meetingId: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    console.log(`[Zoom] Closing meeting ${meetingId}`);

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'end',
      }),
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      console.warn(`Zoom close warning: ${error}`);
    }

    console.log(`[Zoom] Meeting closed successfully`);
  } catch (err) {
    console.error('Zoom close error:', err);
    // Don't throw - non-critical
  }
}

/**
 * Send live stream end message and close meeting
 */
async function endZoomLiveStream(meetingId: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    console.log(`[Zoom] Stopping live stream for meeting ${meetingId}`);

    // First, stop the live stream
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/livestream`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stop',
      }),
    });

    // Send closing message to chat
    await sendZoomStartedMessage(meetingId); // Reuse for final message

    // Close the meeting after a short delay
    setTimeout(() => endZoomMeeting(meetingId), 2000);

    console.log(`[Zoom] Live stream stopped and meeting will close`);
  } catch (err) {
    console.error('Zoom end stream error:', err);
  }
}

/**
 * Check if current time matches any scheduled time
 */
function isTimeToRun(scheduleItem: any, now: Date, timezone: string): boolean {
  const times = scheduleItem.schedule.times || [];
  const days = scheduleItem.schedule.days || [];
  const freq = scheduleItem.schedule.repeatFrequency || 'weekly';

  // Get current day of week in the schedule's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // This is a workaround: we'll use simple UTC offset for Asia/Kolkata
  // Asia/Kolkata is UTC+5:30
  const offsetMs = timezone === 'Asia/Kolkata' ? 5.5 * 60 * 60 * 1000 : 0;
  const tzDate = new Date(now.getTime() + offsetMs);
  
  const currentDay = tzDate.getDay();
  const currentHour = String(tzDate.getHours()).padStart(2, '0');
  const currentMin = String(tzDate.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHour}:${currentMin}`;

  // Check if today is in the scheduled days (support both 0-6 and Monday=1 formats)
  if (!days.includes(currentDay) && !days.includes((currentDay + 1) % 7)) {
    return false;
  }

  // Check if current time is within 5 minutes of scheduled time (more flexible)
  return times.some((time: string) => {
    const [schedHour, schedMin] = time.split(':');
    const currentTotalMin = parseInt(currentHour) * 60 + parseInt(currentMin);
    const schedTotalMin = parseInt(schedHour) * 60 + parseInt(schedMin);
    const timeDiff = Math.abs(currentTotalMin - schedTotalMin);
    return timeDiff <= 5; // Within 5-minute window
  });
}

/**
 * POST /api/admin/crm/sadhana-scheduler/run
 * Run scheduled Sadhana messages (called by cron)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided = request.headers.get('x-cron-secret') || 
                       request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!provided || provided !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Allow Vercel Cron
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent.includes('vercel-cron') && cronSecret && 
        !request.headers.get('x-cron-secret')) {
      // Require cron secret if not Vercel
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const Model = await getSadhanaScheduleModel();
    const Lead = mongoose.connection.db?.collection('leads');

    // Find all active schedules
    const schedules = await Model.find({ status: 'active' }).lean();

    let sent = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        const { shouldJoin, shouldCountdown, shouldPlay } = shouldTriggerBotActions(
          schedule,
          now,
          schedule.schedule.timezone
        );

        // Get leads assigned to this user
        const leads = await Lead?.find({ assignedToUserId: schedule.userId }).toArray();
        if (!leads || leads.length === 0) {
          continue;
        }

        // 🤖 BOT JOIN PHASE (N min before scheduled time)
        if (shouldJoin && schedule.enableBotAutomation) {
          try {
            console.log(`[Sadhana] 🤖 BOT JOINING for schedule ${schedule._id}`);
            
            // Extract meeting ID from zoomLink or zoomMeetingId
            let meetingId = schedule.zoomMeetingId || schedule.zoomId;
            let meetingPassword = schedule.zoomPassword;
            
            if (!meetingId && schedule.zoomLink) {
              const { meetingId: extracted, password } = extractZoomDetailsFromLink(schedule.zoomLink);
              meetingId = extracted;
              meetingPassword = password || meetingPassword;
              
              // Save extracted values back to schedule
              if (meetingId) {
                try {
                  const SadhanaSchedule = await getSadhanaScheduleModel();
                  await SadhanaSchedule.findByIdAndUpdate(schedule._id, {
                    zoomMeetingId: meetingId,
                    zoomPassword: meetingPassword,
                  });
                } catch (e) {
                  console.warn('[Sadhana] Warning saving extracted Zoom ID:', e);
                }
              }
            }

            if (!meetingId) {
              console.error('[Sadhana] ❌ No meeting ID found in schedule (zoomMeetingId, zoomId, or zoomLink)');
              continue; // Skip this schedule but continue with others
            }

            // Bot joins and sends ready message
            await botJoinMeeting({
              meetingId,
              meetingPassword,
              videoDurationMinutes: schedule.videoDuration || 40,
            });

            // Clean up old stale meetings
            try {
              await cleanupOldMeetings(schedule.userId, 24);
            } catch (e) {
              console.warn('[Sadhana] Warning during cleanup:', e);
            }
          } catch (err) {
            console.error(`[Sadhana] Bot join error:`, err);
          }
        }

        // ⏳ COUNTDOWN PHASE (2 min before scheduled time)
        if (shouldCountdown && schedule.enableBotAutomation) {
          try {
            // Extract meeting ID if needed
            let meetingId = schedule.zoomMeetingId || schedule.zoomId;
            if (!meetingId && schedule.zoomLink) {
              const { meetingId: extracted } = extractZoomDetailsFromLink(schedule.zoomLink);
              meetingId = extracted;
            }
            
            if (!meetingId) {
              console.warn('[Sadhana] ⏳ No meeting ID for countdown');
              continue; // Skip this schedule but continue with others
            }

            // Send 3 min countdown, 2 min countdown, 1 min countdown
            const currentMinute = now.getMinutes();
            if (currentMinute % 60 === 13) {
              // 13 min mark = 2 minutes before (assuming time is :12 join)
              await sendCountdownMessage(meetingId, 2);
            } else if (currentMinute % 60 === 14) {
              // 14 min mark = 1 minute before
              await sendCountdownMessage(meetingId, 1);
            }
          } catch (err) {
            console.error(`[Sadhana] Countdown error:`, err);
          }
        }

        // 🎬 VIDEO START PHASE (exact scheduled time)
        if (shouldPlay && schedule.enableBotAutomation) {
          try {
            console.log(`[Sadhana] 🎬 VIDEO STARTING for schedule ${schedule._id}`);
            
            // Extract meeting ID if needed
            let meetingId = schedule.zoomMeetingId || schedule.zoomId;
            if (!meetingId && schedule.zoomLink) {
              const { meetingId: extracted } = extractZoomDetailsFromLink(schedule.zoomLink);
              meetingId = extracted;
            }
            
            if (!meetingId) {
              console.warn('[Sadhana] 🎬 No meeting ID for video start');
              continue; // Skip this schedule but continue with others
            }
            
            // START LIVE STREAM: Video plays automatically for all participants
            await startLiveStream(meetingId, schedule.videoUrl, schedule.botName || schedule.name || 'Swar Sadhana');

            // Also send WhatsApp message with reminder
            const message = buildSadhanaMessage(schedule);
            for (const lead of leads) {
              try {
                const phoneNumber = lead.phone || lead.phoneNumber;
                if (!phoneNumber) continue;
                
                await sendWhatsAppText(phoneNumber, message, 'meta');
                sent++;
              } catch (err) {
                console.error(`Failed to send WhatsApp to ${lead.phone}:`, err);
                failed++;
              }
            }

            // Schedule auto-close after configured time
            const autoCloseMinutes = schedule.autoCloseMinutes || schedule.videoDuration || 40;
            if (autoCloseMinutes && autoCloseMinutes > 0) {
              const autoCloseDelayMs = (autoCloseMinutes * 60 * 1000) + 30000; // Add 30 sec buffer
              
              setTimeout(async () => {
                try {
                  console.log(`[Sadhana] 🚀 AUTO-CLOSING meeting after ${autoCloseMinutes} min`);
                  await autoCloseMeeting(meetingId);
                } catch (err) {
                  console.error('[Sadhana] Auto-close error:', err);
                }
              }, autoCloseDelayMs);
            }
          } catch (err) {
            console.error(`[Sadhana] Video start error:`, err);
            failed++;
          }
        }

        // Fallback: If no zoom enabled, just send regular message
        if (!schedule.enableBotAutomation && isTimeToRun(schedule, now, schedule.schedule.timezone)) {
          const message = buildSadhanaMessage(schedule);
          for (const lead of leads) {
            try {
              const phoneNumber = lead.phone || lead.phoneNumber;
              if (!phoneNumber) continue;
              
              await sendWhatsAppText(phoneNumber, message, 'meta');
              sent++;
            } catch (err) {
              console.error(`Failed to send to lead ${lead.phone}:`, err);
              failed++;
            }
          }
        }
      } catch (err) {
        console.error(`Error processing schedule ${schedule._id}:`, err);
        failed++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        sent,
        failed,
        processed: schedules.length,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-scheduler/run');
  }
}

/**
 * Build message for Sadhana schedule
 */
function buildSadhanaMessage(schedule: any): string {
  let message = `🧘‍♀️ *${schedule.name}*\n\n`;

  message += `📹 *Sadhana Video:*\n${schedule.videoUrl}\n\n`;

  if (schedule.zoomLink) {
    message += `🎥 *Join Zoom Meeting:*\n${schedule.zoomLink}\n`;
  } else if (schedule.zoomId) {
    message += `🎥 *Zoom Meeting:*\n`;
    message += `ID: ${schedule.zoomId}\n`;
    if (schedule.zoomPassword) {
      message += `Password: ${schedule.zoomPassword}\n`;
    }
  }

  message += `\n🙏 Namaste!\n`;
  message += `_Sent automatically - Mon to Fri at scheduled times_`;

  return message;
}

/**
 * GET /api/admin/crm/sadhana-scheduler/run
 * GET endpoint for Vercel Cron (they send GET requests)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided = request.headers.get('x-cron-secret') || 
                       request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!provided || provided !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Allow Vercel Cron
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent.includes('vercel-cron')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const Model = await getSadhanaScheduleModel();
    const LeadModel = mongoose.connection.db?.collection('leads');

    const schedules = await Model.find({ status: 'active' }).lean();

    let sent = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        if (!isTimeToRun(schedule, now, schedule.schedule.timezone)) {
          continue;
        }

        const message = buildSadhanaMessage(schedule);
        const leads = await LeadModel?.find({ userId: schedule.userId }).toArray();

        if (!leads || leads.length === 0) {
          continue;
        }

        for (const lead of leads) {
          try {
            await sendWhatsAppText(
              lead.phoneNumber,
              message,
              'meta'
            );
            sent++;
          } catch (err) {
            console.error(`Failed to send to lead ${lead.phoneNumber}:`, err);
            failed++;
          }
        }
      } catch (err) {
        console.error(`Error processing schedule ${schedule._id}:`, err);
        failed++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        sent,
        failed,
        processed: schedules.length,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler/run');
  }
}
