import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { listPrograms, getProgram, getProgramVideoByDate, listProgramVideos, initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';

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
  let hour = parseInt(map.hour);
  if (hour === 24) hour = 0;
  const tzLocalAsUtc = Date.UTC(
    parseInt(map.year),
    parseInt(map.month) - 1,
    parseInt(map.day),
    hour,
    parseInt(map.minute),
    parseInt(map.second)
  );
  const offset = tzLocalAsUtc - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}

function computeSessionStatus(schedule: any, now: Date) {
  const tz = schedule.timezone || 'Asia/Kolkata';
  const times: string[] = Array.isArray(schedule.timeSlots) ? schedule.timeSlots : (schedule.scheduleTime ? [schedule.scheduleTime] : []);
  const videoDuration = Math.max(5, Number(schedule.videoDuration) || 32);
  const countdownMin = Math.min(2, Math.max(0, Number(schedule.countdownMinutes) ?? 1));
  const allowedDays = schedule.days || [0, 1, 2, 3, 4, 5, 6];
  const startDate = schedule.startDate ? new Date(schedule.startDate) : null;

  const candidates: { startUtc: Date; endUtc: Date; dayOffset: number }[] = [];

  for (let offset = -1; offset < 8; offset++) {
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
    nextSession = candidates.find(c => c.startUtc > now) || candidates[0];
  }

  let status: 'waiting' | 'countdown' | 'live' | 'ended' = 'waiting';
  let videoOffsetSeconds = 0;

  if (currentSession) {
    if (now < currentSession.startUtc) {
      status = 'countdown';
    } else if (now < currentSession.endUtc) {
      status = 'live';
      videoOffsetSeconds = Math.max(0, Math.floor((now.getTime() - currentSession.startUtc.getTime()) / 1000));
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

function convertToHLSUrl(videoUrl: string): string {
  if (!videoUrl) return videoUrl;
  if (videoUrl.includes('b-cdn.net') || videoUrl.includes('bunny.net') || videoUrl.includes('bunnycdn')) {
    const baseUrl = videoUrl.split('?')[0].split('#')[0];
    if (baseUrl.includes('/playlist') || baseUrl.endsWith('.m3u8')) return baseUrl;
    if (baseUrl.endsWith('/')) return baseUrl + 'playlist.m3u8';
    return baseUrl + '/playlist.m3u8';
  }
  return videoUrl;
}

function buildVideoUrlWithOffset(videoUrl: string, offsetSeconds: number): string {
  if (!videoUrl) return videoUrl;
  const hlsUrl = convertToHLSUrl(videoUrl);
  if (hlsUrl.includes('.m3u8')) return hlsUrl;
  const sep = hlsUrl.includes('?') ? '&' : '?';
  const autoplay = hlsUrl.includes('autoplay') ? '' : `${sep}autoplay=true`;
  const start = offsetSeconds > 0 ? `${autoplay ? '&' : sep}t=${offsetSeconds}` : '';
  return `${hlsUrl}${autoplay}${start}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, scheduleId, preview } = body;
    await initSadhanaBunnySchema();

    const now = new Date();
    const nowIso = now.toISOString();
    const activeThresholdIso = new Date(now.getTime() - 15 * 1000).toISOString();

    if (sessionId) {
      await bunnyExecute({
        sql: `UPDATE sadhana_live_participants_sql SET last_seen = ? WHERE session_id = ?`,
        args: [nowIso, sessionId]
      }).catch(() => {});
    }

    // Clean up stale participants
    await bunnyExecute({
      sql: `DELETE FROM sadhana_live_participants_sql WHERE last_seen < ?`,
      args: [activeThresholdIso]
    }).catch(() => {});

    // Fetch active programs from BunnyDB
    const allPrograms = await listPrograms({ active: true });
    let activeProgram: any = null;
    if (scheduleId && scheduleId !== 'default') {
      activeProgram = allPrograms.find((p: any) => p && (p.id === scheduleId || p.slug === scheduleId));
    }
    if (!activeProgram) {
      activeProgram = allPrograms.find((p: any) => p && p.slug.includes('hindi')) || allPrograms[0] || null;
    }

    const participantsRes = await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_participants_sql WHERE last_seen >= ? ORDER BY joined_at ASC LIMIT 200`,
      args: [activeThresholdIso]
    }).catch(() => ({ rows: [] }));
    const activeParticipants = participantsRes.rows || [];

    const roomSlug = activeProgram?.slug || 'default';
    const chatRes = await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_chat_sql WHERE program_slug = ? ORDER BY created_at DESC LIMIT 50`,
      args: [roomSlug]
    }).catch(() => ({ rows: [] }));
    const chatMessages = chatRes.rows || [];

    if (!activeProgram) {
      return NextResponse.json({
        success: true,
        count: activeParticipants.length,
        participants: [],
        schedule: null,
        session: null,
        playableVideoUrl: null,
        chat: [],
        serverTime: nowIso
      });
    }

    const tz = activeProgram.timezone || 'Asia/Kolkata';
    const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
    const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
    const yyyymmdd = `${y}-${mo}-${d}`;

    // 1. Fetch today's video directly from sadhana_program_videos_sql
    const dbTodayVideo = await getProgramVideoByDate(activeProgram.id, yyyymmdd);

    // 2. Fetch all program videos for upcoming list & fallback to latest video
    const allProgramVideos = await listProgramVideos(activeProgram.id);
    const latestUploadedVideo = allProgramVideos.length > 0 ? allProgramVideos[allProgramVideos.length - 1] : null;

    const todayEntry = activeProgram.videoCalendar ? activeProgram.videoCalendar[yyyymmdd] : null;
    const effectiveVideoObj = dbTodayVideo || todayEntry || latestUploadedVideo;

    // Resolve today's effective video URL
    const rawVideoUrl = (
      (dbTodayVideo ? (dbTodayVideo.hlsUrl || dbTodayVideo.videoUrl) : '') ||
      (todayEntry ? (todayEntry.hlsUrl || todayEntry.videoUrl) : '') ||
      activeProgram.playerUrl ||
      (latestUploadedVideo ? (latestUploadedVideo.hlsUrl || latestUploadedVideo.videoUrl) : '') ||
      ''
    ).trim();

    let sessionInfo = computeSessionStatus(activeProgram, now);

    if (preview) {
      sessionInfo = {
        ...sessionInfo,
        status: 'live',
        sessionStartUtc: nowIso,
        sessionEndUtc: new Date(now.getTime() + (activeProgram.videoDuration || 32) * 60 * 1000).toISOString(),
        videoOffsetSeconds: 0,
      };
    }

    let playableVideoUrl: string | null = null;
    if ((sessionInfo.status === 'live' || preview) && rawVideoUrl) {
      playableVideoUrl = buildVideoUrlWithOffset(rawVideoUrl, sessionInfo.videoOffsetSeconds);
    }

    const todayTitle = (effectiveVideoObj?.title && effectiveVideoObj.title.trim()) || activeProgram.name || 'Daily Sadhana Practice';
    let todayVideo: any = null;
    if (rawVideoUrl) {
      todayVideo = {
        date: effectiveVideoObj?.date || yyyymmdd,
        title: todayTitle,
        videoUrl: rawVideoUrl,
        hlsUrl: rawVideoUrl.includes('.m3u8') ? rawVideoUrl : null,
      };
    }

    const upcomingVideos: any[] = [];
    if (Array.isArray(allProgramVideos) && allProgramVideos.length > 0) {
      allProgramVideos
        .filter((v: any) => v && v.date && v.date > yyyymmdd)
        .slice(0, 7)
        .forEach((v: any) => {
          upcomingVideos.push({
            date: v.date,
            title: (v.title && v.title.trim()) || activeProgram.name || 'Daily Practice'
          });
        });
    }

    const timeSlots = Array.isArray(activeProgram.timeSlots) ? activeProgram.timeSlots : ['07:00', '19:00'];

    return NextResponse.json({
      success: true,
      count: activeParticipants.length,
      participants: activeParticipants.map((p: any) => ({
        name: p.name,
        joinedAt: p.joined_at || p.joinedAt,
      })),
      schedule: {
        id: activeProgram.id,
        slug: activeProgram.slug,
        name: activeProgram.name,
        videoUrl: rawVideoUrl,
        videoDuration: activeProgram.videoDuration || 32,
        timezone: tz,
        timeSlots,
      },
      program: {
        slug: activeProgram.slug,
        name: activeProgram.name,
        description: activeProgram.description,
        timezone: tz,
        scheduleTime: timeSlots,
        timeSlots,
      },
      todayVideo,
      upcomingVideos,
      session: sessionInfo,
      playableVideoUrl: playableVideoUrl || rawVideoUrl,
      playerUrl: rawVideoUrl,
      isHLS: rawVideoUrl.includes('.m3u8') || rawVideoUrl.includes('b-cdn.net'),
      chat: [...chatMessages].reverse().map((m: any) => ({
        id: String(m.id),
        name: m.sender,
        message: m.message,
        createdAt: m.created_at || m.createdAt,
      })),
      serverTime: nowIso,
    });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/state');
  }
}
