import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { autoCloseMeeting } from '@/lib/zoomBotServiceSimple';
import { startSadhanaBot, stopSadhanaBot, isBotApiConfigured } from '@/lib/crm/zoomMeetingSdkBot';
import {
  listSadhanaSchedules,
  updateSadhanaSchedule,
  SadhanaScheduleItem,
} from '@/lib/bunnySadhanaSchedulerRepository';
import { listPrograms, updateProgram } from '@/lib/bunnySadhanaRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

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
  return (
    schedule.zoomMeetingId ||
    schedule.zoomId ||
    extractZoomDetailsFromLink(schedule.zoomLink || '').meetingId ||
    null
  );
}

function resolveMeetingPassword(schedule: any): string {
  return (
    schedule.zoomPassword ||
    extractZoomDetailsFromLink(schedule.zoomLink || '').password ||
    ''
  );
}

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

function isScheduledNow(
  times: string[],
  days: number[],
  now: Date,
  timezone: string,
  offsetMinutes: number = 0
): boolean {
  if (!times || times.length === 0 || !days || days.length === 0) return false;

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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

async function notifyLeadsFromBunny(userId?: string, schedule?: any): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  if (!schedule) return { sent, failed };

  try {
    let sql = 'SELECT data_json FROM leads_sql';
    const args: any[] = [];
    if (userId) {
      sql += ' WHERE owner_user_id = ?';
      args.push(userId);
    }
    sql += ' LIMIT 100';

    const r = await bunnyExecute({ sql, args });
    const message = buildSadhanaMessage(schedule);

    for (const row of r.rows) {
      try {
        const lead = row.data_json ? JSON.parse(String(row.data_json)) : null;
        const phone = lead?.phone || lead?.phoneNumber;
        if (!phone) continue;
        await sendWhatsAppText(phone, message);
        sent++;
      } catch (err) {
        failed++;
      }
    }
  } catch (err) {
    console.warn('[Sadhana RUN] Lead notification error:', err);
  }
  return { sent, failed };
}

async function runSadhanaSchedulerTick() {
  const now = new Date();
  const schedules = await listSadhanaSchedules({ status: 'active' });
  const programs = await listPrograms({ active: true });

  console.log(`[Sadhana RUN] 🔍 Found ${schedules.length} schedule(s) & ${programs.length} program(s) in Bunny DB at ${now.toISOString()}`);

  let sent = 0;
  let failed = 0;
  let joined = 0;
  let closed = 0;

  // 1. Process standard schedules in crm_sadhana_schedules_sql
  for (const schedule of schedules) {
    try {
      const timezone = schedule.schedule?.timezone || 'Asia/Kolkata';

      // Auto-close active bot sessions when due
      if (schedule.activeBotSession?.closeAt) {
        const closeAtDate = new Date(schedule.activeBotSession.closeAt);
        if (closeAtDate <= now) {
          const session = schedule.activeBotSession;
          console.log(`[Sadhana RUN] 🛑 Auto-closing meeting ${session.meetingId} for "${schedule.name}"`);
          try {
            await stopSadhanaBot(session.meetingId);
            await autoCloseMeeting({
              meetingId: session.meetingId,
              meetingPassword: session.meetingPassword,
              videoDurationMinutes: schedule.videoDuration || 40,
            });
            closed++;
          } catch (err) {
            console.error(`[Sadhana RUN] Auto-close error for "${schedule.name}":`, err);
          } finally {
            await updateSadhanaSchedule(schedule.id, { activeBotSession: null });
          }
        }
      }

      if (!schedule.enableBotAutomation) continue;
      const botJoinMinutes = schedule.botJoinMinutes || 5;
      if (!isScheduledNow(schedule.schedule?.times || [], schedule.schedule?.days || [], now, timezone, botJoinMinutes)) {
        continue;
      }

      const currentSlot = slotKey(now, timezone);
      if (schedule.lastTriggeredSlot === currentSlot) continue;

      // Idempotency: claim this slot in Bunny Database
      await updateSadhanaSchedule(schedule.id, { lastTriggeredSlot: currentSlot });

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
        console.error('[Sadhana RUN] ❌ Sadhana bot API not configured');
        continue;
      }

      const meetingPassword = resolveMeetingPassword(schedule);
      const videoDuration = schedule.videoDuration || 40;

      console.log(`[Sadhana RUN] 🤖 Joining "${schedule.name}" (meeting ${meetingId}) for slot ${currentSlot}`);
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
      const closeAt = new Date(now.getTime() + (botJoinMinutes + videoDuration + 2) * 60 * 1000).toISOString();
      await updateSadhanaSchedule(schedule.id, {
        activeBotSession: {
          meetingId,
          meetingPassword,
          startedAt: now.toISOString(),
          closeAt,
        },
      });

      const notifyResult = await notifyLeadsFromBunny(schedule.userId, schedule);
      sent += notifyResult.sent;
      failed += notifyResult.failed;
    } catch (err) {
      console.error(`[Sadhana RUN] Error processing schedule ${schedule.id}:`, err);
      failed++;
    }
  }

  // 2. Process programs in sadhana_programs_sql (e.g. Hindi Swar YOga L-1 Sadhana)
  for (const prog of programs) {
    try {
      if (!prog.enableBotAutomation || !prog.active) continue;

      const meetingId = resolveMeetingId(prog);
      if (!meetingId) continue; // No zoom meeting configured for this program

      const timezone = prog.timezone || 'Asia/Kolkata';
      const botJoinMinutes = prog.botJoinMinutes || 5;
      const times = Array.isArray(prog.timeSlots) ? prog.timeSlots : [];
      const days = Array.isArray(prog.days) ? prog.days : [0, 1, 2, 3, 4, 5, 6];

      if (!isScheduledNow(times, days, now, timezone, botJoinMinutes)) continue;

      const currentSlot = slotKey(now, timezone);
      const todayStr = new Date().toLocaleString('sv-SE', { timeZone: timezone }).split(' ')[0];
      const todayVideo = prog.videoCalendar?.[todayStr];
      const videoUrl = todayVideo?.hlsUrl || todayVideo?.videoUrl || prog.playerUrl || '';

      if (!videoUrl) {
        console.warn(`[Sadhana RUN] Program "${prog.name}" has slot now but no video assigned for date ${todayStr}`);
        continue;
      }

      if (!isBotApiConfigured()) {
        console.error('[Sadhana RUN] ❌ Sadhana bot API not configured');
        continue;
      }

      const meetingPassword = resolveMeetingPassword(prog);
      const videoDuration = prog.videoDuration || 40;

      console.log(`[Sadhana RUN] 🤖 Joining program "${prog.name}" (meeting ${meetingId}) for slot ${currentSlot}`);
      const result = await startSadhanaBot({
        meetingNumber: meetingId,
        meetingPassword,
        botName: prog.botName || '🤖 Swar Yoga Bot',
        videoUrl,
        chatMessages: [
          { message: `🧘 Sadhana starting in ${botJoinMinutes} minutes — Namaste 🙏`, delayMinutes: 0 },
        ],
        enableAiChatReplies: false,
        durationMinutes: videoDuration,
        videoStartDelayMinutes: botJoinMinutes,
      });

      if (result.success) {
        joined++;
        console.log(`[Sadhana RUN] ✅ Bot joined program "${prog.name}"`);
      }
    } catch (progErr) {
      console.error(`[Sadhana RUN] Error processing program ${prog.id}:`, progErr);
    }
  }

  return {
    scannedSchedules: schedules.length,
    scannedPrograms: programs.length,
    joined,
    closed,
    sent,
    failed,
    timestamp: now.toISOString(),
  };
}

/**
 * POST /api/admin/crm/sadhana-scheduler/run
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided =
        request.headers.get('x-cron-secret') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
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
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided =
        request.headers.get('x-cron-secret') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
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
