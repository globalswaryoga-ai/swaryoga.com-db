import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

async function getDb() {
  await connectDB();
  return mongoose.connection.useDb('swaryoga_admin_crm');
}

/**
 * For a given schedule and current time, determine the current session status:
 * - waiting: no session today or too far before next session
 * - countdown: within botJoinMinutes of scheduled start
 * - live: between scheduled start and (start + videoDuration)
 * - ended: after scheduled end, before next session
 *
 * Returns session start/end times for today's session (if applicable) in UTC.
 */
function computeSessionStatus(schedule: any, now: Date) {
  const tz = schedule.schedule?.timezone || 'Asia/Kolkata';
  const times: string[] = schedule.schedule?.times || [];
  const days: number[] = schedule.schedule?.days || [];
  const videoDuration = schedule.videoDuration || 40;
  const countdownMin = schedule.botJoinMinutes || 5;
  const repeatFrequency = schedule.schedule?.repeatFrequency || 'weekly';

  // Get "now" in the schedule's timezone as Y-M-D H:M
  const localParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now);

  const partsMap: Record<string, string> = {};
  localParts.forEach((p) => { partsMap[p.type] = p.value; });

  const todayDayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partsMap.weekday);
  const nowHour = parseInt(partsMap.hour);
  const nowMin = parseInt(partsMap.minute);
  const nowTotalMin = nowHour * 60 + nowMin;

  // Build candidate session windows (today + next 7 days)
  const candidates: { startUtc: Date; endUtc: Date; dayOffset: number }[] = [];

  for (let offset = 0; offset < 8; offset++) {
    const checkDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const dayOfWeek = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'narrow' })
        .format(checkDate) === '' ? '0' : '0'
    );
    const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
      .format(checkDate);
    const dayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayName);

    // Check if this day is scheduled
    const isScheduled = repeatFrequency === 'daily' || days.includes(dayIdx);
    if (!isScheduled) continue;

    for (const t of times) {
      const [h, m] = t.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;

      // Build a Date in the target timezone
      const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(checkDate);
      const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(checkDate);
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(checkDate);

      // Create UTC date by finding what UTC time corresponds to this local time in the given timezone
      const iso = `${y}-${mo}-${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const startUtc = zonedTimeToUtc(iso, tz);
      const endUtc = new Date(startUtc.getTime() + videoDuration * 60 * 1000);

      candidates.push({ startUtc, endUtc, dayOffset: offset });
    }
  }

  candidates.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

  // Find relevant session
  let currentSession: { startUtc: Date; endUtc: Date } | null = null;
  let nextSession: { startUtc: Date; endUtc: Date } | null = null;

  for (const c of candidates) {
    const countdownStart = new Date(c.startUtc.getTime() - countdownMin * 60 * 1000);
    if (now >= countdownStart && now < c.endUtc) {
      currentSession = c;
      break;
    }
    if (now < countdownStart) {
      nextSession = c;
      break;
    }
  }

  if (!currentSession && !nextSession && candidates.length > 0) {
    nextSession = candidates[0];
  }

  let status: 'waiting' | 'countdown' | 'live' | 'ended' = 'waiting';
  let videoOffsetSeconds = 0;

  if (currentSession) {
    if (now < currentSession.startUtc) {
      status = 'countdown';
    } else if (now < currentSession.endUtc) {
      status = 'live';
      videoOffsetSeconds = Math.floor((now.getTime() - currentSession.startUtc.getTime()) / 1000);
    } else {
      status = 'ended';
    }
  }

  return {
    status,
    sessionStartUtc: currentSession?.startUtc.toISOString() || null,
    sessionEndUtc: currentSession?.endUtc.toISOString() || null,
    nextSessionUtc: nextSession?.startUtc.toISOString() || null,
    videoOffsetSeconds,
    countdownMinutes: countdownMin,
    videoDurationMinutes: videoDuration,
  };
}

/**
 * Convert a local time (as ISO-like string) in a timezone to UTC Date.
 * Handles DST by using the timezone's offset at that moment.
 */
function zonedTimeToUtc(localIso: string, tz: string): Date {
  // Parse the local time as if it were UTC, then adjust by the tz offset
  const asUtc = new Date(localIso + 'Z');
  // Find offset between tz and UTC for that instant
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(asUtc);
  const map: Record<string, string> = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  const tzLocalAsUtc = Date.UTC(
    parseInt(map.year),
    parseInt(map.month) - 1,
    parseInt(map.day),
    parseInt(map.hour),
    parseInt(map.minute),
    parseInt(map.second)
  );
  const offset = tzLocalAsUtc - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}

function buildVideoUrlWithOffset(videoUrl: string, offsetSeconds: number): string {
  if (!videoUrl) return videoUrl;
  const sep = videoUrl.includes('?') ? '&' : '?';
  const autoplay = videoUrl.includes('autoplay') ? '' : `${sep}autoplay=true`;
  const start = offsetSeconds > 0 ? `${autoplay ? '&' : sep}t=${offsetSeconds}` : '';
  return `${videoUrl}${autoplay}${start}`;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, scheduleId } = await request.json();
    const db = await getDb();
    const participants = db.collection('sadhana_live_participants');
    const schedules = db.collection('sadhana_schedules');
    const chatCol = db.collection('sadhana_live_chat');

    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 15 * 1000);

    if (sessionId) {
      await participants.updateOne({ sessionId }, { $set: { lastSeen: now } });
    }

    await participants.deleteMany({ lastSeen: { $lt: activeThreshold } });

    const activeParticipants = await participants
      .find({ lastSeen: { $gte: activeThreshold } })
      .sort({ joinedAt: 1 })
      .limit(200)
      .toArray();

    let activeSchedule: any = null;
    if (scheduleId && scheduleId !== 'default') {
      try {
        activeSchedule = await schedules.findOne({
          _id: new mongoose.Types.ObjectId(scheduleId),
        });
      } catch {
        activeSchedule = null;
      }
    }
    if (!activeSchedule) {
      activeSchedule = await schedules.findOne(
        { status: 'active' },
        { sort: { updatedAt: -1 } }
      );
    }

    let sessionInfo = null;
    let playableVideoUrl = null;
    if (activeSchedule) {
      sessionInfo = computeSessionStatus(activeSchedule, now);
      if (sessionInfo.status === 'live' && activeSchedule.videoUrl) {
        playableVideoUrl = buildVideoUrlWithOffset(
          activeSchedule.videoUrl,
          sessionInfo.videoOffsetSeconds
        );
      }
    }

    const chatMessages = await chatCol
      .find({ scheduleId: activeSchedule?._id?.toString() || 'default' })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      count: activeParticipants.length,
      participants: activeParticipants.map((p: any) => ({
        name: p.name,
        joinedAt: p.joinedAt,
      })),
      schedule: activeSchedule
        ? {
            id: activeSchedule._id.toString(),
            name: activeSchedule.name,
            videoUrl: activeSchedule.videoUrl,
            videoDuration: activeSchedule.videoDuration || 40,
            timezone: activeSchedule.schedule?.timezone || 'Asia/Kolkata',
          }
        : null,
      session: sessionInfo,
      playableVideoUrl,
      chat: chatMessages.reverse().map((m: any) => ({
        id: m._id.toString(),
        name: m.name,
        message: m.message,
        createdAt: m.createdAt,
      })),
      serverTime: now.toISOString(),
    });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/state');
  }
}
