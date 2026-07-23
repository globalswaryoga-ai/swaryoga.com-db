import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { autoCloseMeeting } from '@/lib/zoomBotServiceSimple';
import { startSadhanaBot, stopSadhanaBot, isBotApiConfigured } from '@/lib/crm/zoomMeetingSdkBot';

export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';

// This is the single production trigger path for Sadhana schedules (hit
// every minute by the Vercel Cron entry for this route in vercel.json).
//
// It used to run alongside a second, independent trigger mechanism: an
// in-process setInterval scheduler (lib/sadhanaSchedulerServiceV2.ts)
// bootstrapped as a module-level side effect in app/layout.tsx. On Vercel,
// every cold serverless container that renders a page re-runs that side
// effect and starts its own copy of the interval loop, so multiple warm
// containers ran independent, un-coordinated schedulers against the same
// DB state at once — each with its own in-memory "already triggered this
// minute" Set that no other container could see. That's what caused a
// schedule to fire twice ("meeting not ended, it restarted"), and it also
// meant `autoCloseMeeting` was scheduled via a bare setTimeout() living
// inside one particular invocation — which is not guaranteed to survive
// long enough to actually fire (a Sadhana session is 40+ minutes; Vercel
// functions are not). See app/layout.tsx for the removal of that bootstrap.
//
// The fix: this cron-invoked route is now the *only* trigger, and all
// state that needs to survive between the 1-minute cron ticks (whether a
// schedule already fired for its current slot, and when an active bot
// session should be auto-closed) is persisted on the schedule document
// itself, not in process memory.

const sadhanaScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    botName: { type: String, default: 'Swar Sadhana' },
    videoUrl: { type: String, required: true },
    videoDuration: { type: Number, default: 40 },
    botJoinMinutes: { type: Number, default: 5 },
    chatMessages: [{ message: String, delayMinutes: Number }],
    enableAiChatReplies: { type: Boolean, default: false },
    zoomLink: { type: String },
    zoomId: { type: String },
    zoomPassword: { type: String },
    zoomMeetingId: { type: String },
    enableBotAutomation: { type: Boolean, default: true },
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
    // Idempotency: which scheduled slot ("YYYY-MM-DD HH:MM" in the
    // schedule's own timezone) we last triggered a bot join for, so a
    // schedule is never joined twice for the same slot even if the cron
    // overlaps itself or a manual Test Bot click races it.
    lastTriggeredSlot: String,
    // The currently-running bot session, if any, so auto-close survives
    // across cron invocations instead of relying on an in-memory timer.
    activeBotSession: {
      meetingId: String,
      meetingPassword: String,
      startedAt: Date,
      closeAt: Date,
    },
  },
  { collection: 'sadhana_schedules' }
);

async function getSadhanaScheduleModel() {
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  return db.models.SadhanaSchedule || db.model('SadhanaSchedule', sadhanaScheduleSchema);
}

function extractZoomDetailsFromLink(zoomLink: string): { meetingId?: string; password?: string } {
  if (!zoomLink) return {};
  const urlMatch = zoomLink.match(/\/j\/(\d+)/);
  const pwdMatch = zoomLink.match(/[?&]pwd=([^&]+)/);
  return {
    meetingId: urlMatch ? urlMatch[1] : undefined,
    password: pwdMatch ? decodeURIComponent(pwdMatch[1]) : undefined,
  };
}

function resolveMeetingId(schedule: any): string | null {
  return schedule.zoomMeetingId || schedule.zoomId || extractZoomDetailsFromLink(schedule.zoomLink || '').meetingId || null;
}

function resolveMeetingPassword(schedule: any): string {
  return schedule.zoomPassword || extractZoomDetailsFromLink(schedule.zoomLink || '').password || '';
}

/** "YYYY-MM-DD HH:MM" for `now` in `timezone`, used as the idempotency key for a scheduled slot. */
function slotKey(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`;
}

// `offsetMinutes` shifts the check earlier — e.g. offsetMinutes=5 matches
// when `now` is 5 minutes before a scheduled time, so the bot can join
// ahead of the actual start for a pre-roll countdown/welcome message.
function isScheduledNow(schedule: any, now: Date, timezone: string, offsetMinutes: number = 0): boolean {
  const times: string[] = Array.isArray(schedule.schedule?.times) ? schedule.schedule.times : [];
  const days: number[] = Array.isArray(schedule.schedule?.days) ? schedule.schedule.days : [];
  if (times.length === 0 || days.length === 0) return false;

  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(now)) if (p.type !== 'literal') map[p.type] = p.value;
  const currentTotalMin = parseInt(map.hour || '0', 10) * 60 + parseInt(map.minute || '0', 10);

  const currentDay = new Date(now.toLocaleString('sv-SE', { timeZone: timezone })).getDay();
  if (!days.includes(currentDay)) return false;

  return times.some((time) => {
    const [h, m] = time.split(':');
    const scheduledTotalMin = parseInt(h, 10) * 60 + parseInt(m, 10) - offsetMinutes;
    return Math.abs(currentTotalMin - scheduledTotalMin) <= 1;
  });
}

function buildSadhanaMessage(schedule: any): string {
  let message = `🧘‍♀️ *${schedule.name}*\n\n`;
  message += `📹 *Sadhana Video:*\n${schedule.videoUrl}\n\n`;
  if (schedule.zoomLink) {
    message += `🎥 *Join Zoom Meeting:*\n${schedule.zoomLink}\n`;
  } else if (schedule.zoomId) {
    message += `🎥 *Zoom Meeting:*\nID: ${schedule.zoomId}\n`;
    if (schedule.zoomPassword) message += `Password: ${schedule.zoomPassword}\n`;
  }
  message += `\n🙏 Namaste!\n`;
  message += `_Sent automatically - scheduled Sadhana session_`;
  return message;
}

async function notifyLeads(schedule: any): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  try {
    const Lead = mongoose.connection.db?.collection('leads');
    const message = buildSadhanaMessage(schedule);
    const leads = (await Lead?.find({ userId: schedule.userId }).toArray()) ?? [];
    for (const lead of leads) {
      const phoneNumber = lead.phone || lead.phoneNumber;
      if (!phoneNumber) continue;
      try {
        await sendWhatsAppText(phoneNumber, message);
        sent++;
      } catch (err) {
        console.error(`[Sadhana RUN] Failed to notify lead ${phoneNumber}:`, err);
        failed++;
      }
    }
  } catch (err) {
    console.warn('[Sadhana RUN] Lead notification skipped:', err);
  }
  return { sent, failed };
}

async function runSadhanaSchedulerTick() {
  await connectDB();

  const now = new Date();
  const Model = await getSadhanaScheduleModel();
  const schedules = await Model.find({ status: 'active' });

  console.log(`[Sadhana RUN] 🔍 Found ${schedules.length} active schedule(s) at ${now.toISOString()}`);

  let sent = 0;
  let failed = 0;
  let joined = 0;
  let closed = 0;

  for (const schedule of schedules) {
    try {
      const timezone = schedule.schedule?.timezone || 'Asia/Kolkata';

      // ---- Auto-close: independent of the trigger check below, so a
      // session started at any point still gets closed on time even if
      // this schedule isn't "due" again right now. ----
      if (schedule.activeBotSession?.closeAt && schedule.activeBotSession.closeAt <= now) {
        const session = schedule.activeBotSession;
        console.log(`[Sadhana RUN] 🛑 Auto-closing meeting ${session.meetingId} for "${schedule.name}"`);
        try {
          await stopSadhanaBot(session.meetingId);
          await autoCloseMeeting({
            meetingId: session.meetingId,
            meetingPassword: session.meetingPassword || undefined,
            videoDurationMinutes: schedule.videoDuration || 40,
          });
          closed++;
        } catch (err) {
          console.error(`[Sadhana RUN] Auto-close error for "${schedule.name}":`, err);
        } finally {
          // Clear regardless of outcome — a retry storm hitting a meeting
          // that's already gone is worse than a rare missed close.
          schedule.activeBotSession = undefined;
          await schedule.save();
        }
      }

      if (!schedule.enableBotAutomation) continue;
      // Bot joins botJoinMinutes before the scheduled start (default 5) so
      // it can post an early countdown/welcome chat message; the video
      // itself is delayed on the bot side to still start at the real time.
      const botJoinMinutes = schedule.botJoinMinutes || 5;
      if (!isScheduledNow(schedule, now, timezone, botJoinMinutes)) continue;

      const currentSlot = slotKey(now, timezone);
      if (schedule.lastTriggeredSlot === currentSlot) continue; // already handled this slot

      // Claim this slot atomically before doing any work, so a slower
      // concurrent invocation (or a Test Bot click landing in the same
      // minute) can't also pass the check above and double-join.
      const claim = await Model.findOneAndUpdate(
        { _id: schedule._id, lastTriggeredSlot: { $ne: currentSlot } },
        { $set: { lastTriggeredSlot: currentSlot } },
        { new: true }
      );
      if (!claim) continue; // another invocation already claimed this slot

      const meetingId = resolveMeetingId(schedule);
      if (!meetingId) {
        console.error(`[Sadhana RUN] ❌ No meeting ID for "${schedule.name}"`);
        continue;
      }
      if (!schedule.videoUrl) {
        console.error(`[Sadhana RUN] ❌ No video URL for "${schedule.name}"`);
        continue;
      }
      if (!isBotApiConfigured()) {
        console.error('[Sadhana RUN] ❌ Sadhana bot API not configured (ZOOM_SDK_KEY/SECRET or SADHANA_BOT_API_URL/SECRET missing)');
        continue;
      }

      const meetingPassword = resolveMeetingPassword(schedule);
      const videoDuration = schedule.videoDuration || 40;

      console.log(`[Sadhana RUN] 🤖 Joining "${schedule.name}" (meeting ${meetingId}) for slot ${currentSlot}, video starts in ${botJoinMinutes}min`);

      const result = await startSadhanaBot({
        meetingNumber: meetingId,
        meetingPassword,
        botName: schedule.botName || 'Swar Sadhana',
        videoUrl: schedule.videoUrl,
        chatMessages: schedule.chatMessages?.length
          ? schedule.chatMessages
          : [{ message: `🧘 Sadhana starting in ${botJoinMinutes} minutes — get ready! Namaste 🙏`, delayMinutes: 0 }],
        enableAiChatReplies: !!schedule.enableAiChatReplies,
        durationMinutes: videoDuration,
        videoStartDelayMinutes: botJoinMinutes,
      });

      if (!result.success) {
        console.error(`[Sadhana RUN] ❌ Bot failed to start for "${schedule.name}": ${result.error}`);
        continue;
      }

      joined++;
      console.log(`[Sadhana RUN] ✅ Bot joined "${schedule.name}" (pid ${result.pid})`);

      const closeAt = new Date(now.getTime() + (botJoinMinutes + videoDuration + 2) * 60 * 1000);
      await Model.updateOne(
        { _id: schedule._id },
        { $set: { activeBotSession: { meetingId, meetingPassword, startedAt: now, closeAt } } }
      );

      const notifyResult = await notifyLeads(schedule);
      sent += notifyResult.sent;
      failed += notifyResult.failed;
    } catch (err) {
      console.error(`[Sadhana RUN] Error processing schedule ${schedule._id}:`, err);
      failed++;
    }
  }

  return { scannedSchedules: schedules.length, joined, closed, sent, failed, timestamp: now.toISOString() };
}

/**
 * POST /api/admin/crm/sadhana-scheduler/run
 * Run scheduled Sadhana bot joins/closes (called by Vercel Cron).
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided =
        request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      const userAgent = request.headers.get('user-agent') || '';
      if (!userAgent.includes('vercel-cron') && provided !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await runSadhanaSchedulerTick();
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-scheduler/run');
  }
}

/**
 * GET /api/admin/crm/sadhana-scheduler/run
 * Same tick logic — kept for Vercel Cron configurations that send GET.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided =
        request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      const userAgent = request.headers.get('user-agent') || '';
      if (!userAgent.includes('vercel-cron') && provided !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await runSadhanaSchedulerTick();
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler/run');
  }
}
