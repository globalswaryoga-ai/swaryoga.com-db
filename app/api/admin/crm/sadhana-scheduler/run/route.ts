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

export const dynamic = 'force-dynamic';

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
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
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

  // Get current time in the schedule's timezone using native toLocaleString
  const localStr = now.toLocaleString('en-US', { timeZone: timezone, hour12: false });
  const [datePart, timePart] = localStr.split(', ');
  const [month, date, year] = datePart.split('/');
  const [currentHour, currentMin] = timePart.split(':');
  const currentTotalMin = parseInt(currentHour) * 60 + parseInt(currentMin);
  
  // Get day of week: create a date in that timezone and check its day
  const utcDate = new Date(now.toLocaleString('sv-SE', { timeZone: timezone }));
  const currentDay = utcDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  console.log(`[Sadhana] ⏰ Current time check (${timezone}): Day=${currentDay}, Time=${currentHour}:${currentMin} (${currentTotalMin}min), Scheduled days=[${days}], times=[${times}]`);

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

    console.log(`[Sadhana RUN] 🔍 Found ${schedules.length} active schedules at ${now.toISOString()}`);

    if (schedules.length === 0) {
      console.warn('[Sadhana RUN] ⚠️ NO ACTIVE SCHEDULES FOUND!');
      return NextResponse.json({
        scannedSchedules: 0,
        executedSchedules: 0,
        error: 'No active schedules found'
      }, { status: 200 });
    }

    let sent = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        console.log(`[Sadhana RUN] 📋 Processing schedule: "${schedule.name}" (${schedule._id})`);

        // ⚠️ BULLETPROOF FIX: Ensure schedule data is valid
        if (!schedule.schedule) {
          console.error(`[Sadhana RUN] ❌ SKIP: No schedule object!`);
          continue;
        }

        // Normalize times to array
        let times = schedule.schedule.times;
        if (typeof times === 'string') {
          times = [times];
          console.log(`[Sadhana RUN] ✅ FIXED: times was string, converted to array`);
        }
        times = Array.isArray(times) ? times : [];
        if (times.length === 0) {
          console.warn(`[Sadhana RUN] ⚠️ SKIP: No times configured`);
          continue;
        }

        // Normalize days to array
        let days = schedule.schedule.days;
        if (typeof days === 'number') {
          days = [days];
          console.log(`[Sadhana RUN] ✅ FIXED: days was number, converted to array`);
        }
        days = Array.isArray(days) ? days : [];
        if (days.length === 0) {
          console.warn(`[Sadhana RUN] ⚠️ SKIP: No days configured`);
          continue;
        }

        // Update schedule with normalized data
        schedule.schedule.times = times;
        schedule.schedule.days = days;

        console.log(`[Sadhana RUN] ✅ Schedule validated:`);
        console.log(`[Sadhana RUN]    Times: [${times.join(', ')}]`);
        console.log(`[Sadhana RUN]    Days: [${days.join(', ')}]`);
        console.log(`[Sadhana RUN]    Timezone: ${schedule.schedule.timezone}`);
        console.log(`[Sadhana RUN]    Bot Automation: ${schedule.enableBotAutomation}`);

        const { shouldJoin, shouldCountdown, shouldPlay } = shouldTriggerBotActions(
          schedule,
          now,
          schedule.schedule.timezone
        );

        console.log(`[Sadhana RUN] 🎯 Trigger Check: shouldJoin=${shouldJoin}, shouldCountdown=${shouldCountdown}, shouldPlay=${shouldPlay}`);

        // 🤖 Bot joins and starts recording regardless of leads or participants
        // (people can join or not - bot will be active)

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

            // Send countdown messages to meeting
            console.log(`[Sadhana] ⏳ COUNTDOWN MESSAGE sent to meeting ${meetingId}`);
            await sendZoomCountdownMessage(meetingId, 120); // Send 2 min countdown
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
            const leads = await Lead?.find({ userId: schedule.userId }).toArray() ?? [];
            for (const lead of leads) {
              try {
                const phoneNumber = lead.phone || lead.phoneNumber;
                if (!phoneNumber) continue;

                await sendWhatsAppText(phoneNumber, message);
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

        // Fallback: If bot automation disabled but it's still a scheduled time, send message via WhatsApp
        // (The shouldTriggerBotActions already handled the time logic when enableBotAutomation=true)
        if (!schedule.enableBotAutomation) {
          // Check if we're at scheduled time using basic time comparison
          const times = schedule.schedule.times || [];
          const days = schedule.schedule.days || [];
          
          // Get current time in schedule timezone
          const localStr = now.toLocaleString('en-US', { timeZone: schedule.schedule.timezone, hour12: false });
          const [datePart, timePart] = localStr.split(', ');
          const [hour, min] = timePart.split(':');
          const currentTotalMin = parseInt(hour) * 60 + parseInt(min);
          
          // Get day of week
          const utcDate = new Date(now.toLocaleString('sv-SE', { timeZone: schedule.schedule.timezone }));
          const currentDay = utcDate.getDay();
          
          // Check if today is scheduled
          const isScheduledDay = days.includes(currentDay);
          
          // Check if current time matches any scheduled time (within 5 min window)
          const isScheduledTime = times.some((time: string) => {
            const [sHour, sMin] = time.split(':');
            const sTotalMin = parseInt(sHour) * 60 + parseInt(sMin);
            return Math.abs(currentTotalMin - sTotalMin) <= 5;
          });
          
          if (isScheduledDay && isScheduledTime) {
            const message = buildSadhanaMessage(schedule);
            const leads = await Lead?.find({ userId: schedule.userId }).toArray() ?? [];
            for (const lead of leads) {
              try {
                const phoneNumber = lead.phone || lead.phoneNumber;
                if (!phoneNumber) continue;

                await sendWhatsAppText(phoneNumber, message);
                sent++;
              } catch (err) {
                console.error(`Failed to send to lead ${lead.phone}:`, err);
                failed++;
              }
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

    // Allow all requests for now (testing)
    // In production, validate with Vercel's x-cron-secret header

    const now = new Date();
    const Model = await getSadhanaScheduleModel();
    const LeadModel = mongoose.connection.db?.collection('leads');

    const schedules = await Model.find({ status: 'active' }).lean();

    let sent = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        // Check if we're at scheduled time
        const times = schedule.schedule.times || [];
        const days = schedule.schedule.days || [];
        
        // Get current time in schedule timezone
        const localStr = now.toLocaleString('en-US', { timeZone: schedule.schedule.timezone, hour12: false });
        const [datePart, timePart] = localStr.split(', ');
        const [hour, min] = timePart.split(':');
        const currentTotalMin = parseInt(hour) * 60 + parseInt(min);
        
        // Get day of week
        const utcDate = new Date(now.toLocaleString('sv-SE', { timeZone: schedule.schedule.timezone }));
        const currentDay = utcDate.getDay();
        
        // Check if today is scheduled
        const isScheduledDay = days.includes(currentDay);
        
        // Check if current time matches any scheduled time (within 5 min window)
        const isScheduledTime = times.some((time: string) => {
          const [sHour, sMin] = time.split(':');
          const sTotalMin = parseInt(sHour) * 60 + parseInt(sMin);
          return Math.abs(currentTotalMin - sTotalMin) <= 5;
        });
        
        if (!isScheduledDay || !isScheduledTime) {
          continue;
        }

        // 🤖 BOT JOIN PHASE - Trigger EC2 Puppeteer bot to join Zoom meeting
        if (schedule.enableBotAutomation) {
          try {
            let meetingId = schedule.zoomId;
            let meetingPassword = schedule.zoomPassword;

            if (!meetingId && schedule.zoomLink) {
              const match = schedule.zoomLink.match(/\/j\/(\d+)/);
              if (match) meetingId = match[1];
              const pwMatch = schedule.zoomLink.match(/[?&]pwd=([^&]+)/);
              if (pwMatch) meetingPassword = decodeURIComponent(pwMatch[1]);
            }

            const ec2Url = process.env.ZOOM_BOT_EC2_URL;
            const ec2Secret = process.env.ZOOM_BOT_SECRET;

            if (meetingId && ec2Url) {
              console.log(`[Sadhana] 🤖 Triggering EC2 bot for meeting ${meetingId}`);
              const botRes = await fetch(`${ec2Url}/start-meeting`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-bot-secret': ec2Secret || '',
                },
                body: JSON.stringify({
                  meetingId,
                  password: meetingPassword,
                  videoUrl: schedule.videoUrl,
                  durationMinutes: schedule.videoDuration || 40,
                }),
              });
              const botData = await botRes.json();
              console.log(`[Sadhana] EC2 bot response:`, botData);
            } else if (meetingId) {
              // Fallback to Zoom API bot (chat message only)
              console.log(`[Sadhana] ⚠️ ZOOM_BOT_EC2_URL not set, using API fallback`);
              await botJoinMeeting({
                meetingId,
                meetingPassword,
                videoDurationMinutes: schedule.videoDuration || 40,
              });
            }
          } catch (err) {
            console.error(`[Sadhana] Bot trigger error:`, err);
          }
        }

        const message = buildSadhanaMessage(schedule);
        const leads = await LeadModel?.find({ userId: schedule.userId }).toArray();

        if (leads && leads.length > 0) {
          for (const lead of leads) {
            try {
              await sendWhatsAppText(
                lead.phoneNumber || lead.phone,
                message
              );
              sent++;
            } catch (err) {
              console.error(`Failed to send to lead ${lead.phoneNumber}:`, err);
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
    return handleCrmError(error, 'GET sadhana-scheduler/run');
  }
}
