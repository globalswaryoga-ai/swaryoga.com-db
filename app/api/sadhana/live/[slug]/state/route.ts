import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsDb } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

async function getDb() {
  await connectDB();
  return mongoose.connection.useDb('swaryoga_admin_crm');
}

function zonedTimeToUtc(localIso: string, tz: string): Date {
  const asUtc = new Date(localIso + 'Z');
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

function computeSessionStatus(schedule: any, now: Date) {
  const tz = schedule.timezone || 'Asia/Kolkata';
  const times: string[] = schedule.timeSlots || (schedule.scheduleTime ? [schedule.scheduleTime] : []);
  const videoDuration = schedule.videoDuration || 40;
  const countdownMin = schedule.countdownMinutes || 5;
  const allowedDays = schedule.days || [0, 1, 2, 3, 4, 5, 6];
  const startDate = schedule.startDate ? new Date(schedule.startDate) : null;

  const candidates: { startUtc: Date; endUtc: Date; dayOffset: number }[] = [];

  for (let offset = 0; offset < 8; offset++) {
    const checkDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);

    if (startDate && checkDate < startDate) continue;

    const dayOfWeek = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
    }).format(checkDate);
    const dayNum = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayOfWeek.substring(0, 3));
    if (!allowedDays.includes(dayNum)) continue;

    for (const t of times) {
      if (!t || !t.trim()) continue;
      const [h, m] = t.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;

      const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(checkDate);
      const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(checkDate);
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(checkDate);

      const iso = `${y}-${mo}-${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const startUtc = zonedTimeToUtc(iso, tz);
      const endUtc = new Date(startUtc.getTime() + videoDuration * 60 * 1000);

      candidates.push({ startUtc, endUtc, dayOffset: offset });
    }
  }

  candidates.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

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

function buildVideoUrlWithOffset(videoUrl: string, offsetSeconds: number): string {
  if (!videoUrl) return videoUrl;
  const sep = videoUrl.includes('?') ? '&' : '?';
  const autoplay = videoUrl.includes('autoplay') ? '' : `${sep}autoplay=true`;
  const start = offsetSeconds > 0 ? `${autoplay ? '&' : sep}t=${offsetSeconds}` : '';
  return `${videoUrl}${autoplay}${start}`;
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { sessionId } = await request.json();
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

    // Find schedule by program slug
    let activeSchedule: any = null;
    try {
      activeSchedule = await schedules.findOne({ programSlug: params.slug });
    } catch {
      activeSchedule = null;
    }

    if (!activeSchedule) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    let sessionInfo: any = null;
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

    // Auto-add bot when countdown/live starts, keep lastSeen updated
    if (activeSchedule && sessionInfo && activeSchedule.enableBotAutomation !== false && (sessionInfo.status === 'countdown' || sessionInfo.status === 'live') && sessionInfo.sessionStartUtc) {
      const botName = activeSchedule.botName || '🤖 Swar Yoga Bot';
      const botExists = await participants.findOne({
        name: botName
      });
      if (!botExists) {
        await participants.insertOne({
          name: botName,
          sessionId: 'bot',
          joinedAt: now,
          lastSeen: now,
        });
        // Bot welcome message in chat
        await chatCol.insertOne({
          name: botName,
          message: `Namaste! 🙏 ${activeSchedule.name || 'Session'} starting soon. Welcome everyone!`,
          createdAt: now,
        });
      } else {
        // Keep bot's lastSeen updated so it doesn't get deleted
        await participants.updateOne(
          { name: botName },
          { $set: { lastSeen: now } }
        );
      }
    } else if (activeSchedule && sessionInfo && activeSchedule.enableBotAutomation !== false && sessionInfo.status === 'ended') {
      const botName = activeSchedule.botName || '🤖 Swar Yoga Bot';
      await participants.deleteOne({
        name: botName
      });
      // Bot farewell message
      await chatCol.insertOne({
        name: botName,
        message: 'Thank you for practicing! See you next session. 🙏',
        createdAt: now,
      });
    }

    const chatMessages = await chatCol
      .find({})
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
      program: {
        slug: params.slug,
        name: activeSchedule?.name || 'Sadhana Live',
        timezone: activeSchedule?.timezone || 'Asia/Kolkata',
      },
      todayVideo: activeSchedule?.videoUrl ? {
        title: activeSchedule.name || 'Session',
        videoUrl: activeSchedule.videoUrl,
      } : null,
      upcomingVideos: [],
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
    return handleCrmError(error, 'POST sadhana/live/[slug]/state');
  }
}
