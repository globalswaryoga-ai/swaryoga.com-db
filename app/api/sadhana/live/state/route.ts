import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { listPrograms, getProgram, initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';
import { listSadhanaSchedules } from '@/lib/bunnySadhanaSchedulerRepository';

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
  const tz = schedule.timezone || 'Asia/Kolkata';
  const times: string[] = schedule.timeSlots || (schedule.scheduleTime ? [schedule.scheduleTime] : []);
  const videoDuration = schedule.videoDuration || 40;
  const countdownMin = schedule.countdownMinutes || 5;
  const allowedDays = schedule.days || [0, 1, 2, 3, 4, 5, 6];
  const startDate = schedule.startDate ? new Date(schedule.startDate) : null;

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

  // Build candidate session windows (today + next 7 days)
  // Programs run daily with multiple time slots
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

function convertToHLSUrl(videoUrl: string): string {
  if (!videoUrl) return videoUrl;

  // Always ensure Bunny URLs are HLS format
  if (videoUrl.includes('b-cdn.net') || videoUrl.includes('bunny.net') || videoUrl.includes('bunnycdn')) {
    // Remove query params first
    const baseUrl = videoUrl.split('?')[0].split('#')[0];

    // If already has playlist endpoint, return as-is
    if (baseUrl.includes('/playlist') || baseUrl.endsWith('.m3u8')) {
      return baseUrl;
    }

    // If ends with slash, add playlist.m3u8
    if (baseUrl.endsWith('/')) {
      return baseUrl + 'playlist.m3u8';
    }

    // Otherwise add /playlist.m3u8
    return baseUrl + '/playlist.m3u8';
  }

  // If already HLS, return as-is
  if (videoUrl.includes('.m3u8')) {
    return videoUrl;
  }

  // For other URLs, assume HLS if from streaming services
  if (videoUrl.includes('stream') || videoUrl.includes('hls') || videoUrl.includes('play')) {
    return videoUrl;
  }

  // Fallback: return as-is
  return videoUrl;
}

function buildVideoUrlWithOffset(videoUrl: string, offsetSeconds: number): string {
  if (!videoUrl) return videoUrl;

  // Convert to HLS if needed
  const hlsUrl = convertToHLSUrl(videoUrl);

  // For HLS URLs, we can't add query params easily, so just return the HLS URL
  if (hlsUrl.includes('.m3u8')) {
    return hlsUrl;
  }

  // For non-HLS URLs, add autoplay param
  const sep = hlsUrl.includes('?') ? '&' : '?';
  const autoplay = hlsUrl.includes('autoplay') ? '' : `${sep}autoplay=true`;
  const start = offsetSeconds > 0 ? `${autoplay ? '&' : sep}t=${offsetSeconds}` : '';
  return `${hlsUrl}${autoplay}${start}`;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, scheduleId } = await request.json().catch(() => ({}));
    await initSadhanaBunnySchema();

    const now = new Date();
    const nowIso = now.toISOString();
    const activeThresholdIso = new Date(now.getTime() - 15 * 1000).toISOString();
    const roomSlug = scheduleId || 'default';

    if (sessionId) {
      await bunnyExecute({
        sql: `UPDATE sadhana_live_participants_sql SET last_seen = ? WHERE session_id = ?`,
        args: [nowIso, sessionId]
      });
    }

    // Clean up stale participants
    await bunnyExecute({
      sql: `DELETE FROM sadhana_live_participants_sql WHERE last_seen < ?`,
      args: [activeThresholdIso]
    });

    // Find active schedule or program
    const schedules = await listSadhanaSchedules({ status: 'active' });
    let activeSchedule: any = null;
    if (scheduleId && scheduleId !== 'default') {
      activeSchedule = schedules.find((s: any) => s.id === scheduleId || s._id === scheduleId);
    }
    if (!activeSchedule) {
      activeSchedule = schedules[0] || null;
    }

    const participantsRes = await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_participants_sql WHERE last_seen >= ? ORDER BY joined_at ASC LIMIT 200`,
      args: [activeThresholdIso]
    });
    const activeParticipants = participantsRes.rows || [];

    let sessionInfo: any = null;
    let playableVideoUrl: any = null;
    if (activeSchedule) {
      sessionInfo = computeSessionStatus(activeSchedule, now);

      if (sessionInfo.status === 'live' && activeSchedule.videoUrl) {
        playableVideoUrl = buildVideoUrlWithOffset(
          activeSchedule.videoUrl,
          sessionInfo.videoOffsetSeconds
        );
      }
    }

    const chatRes = await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_chat_sql WHERE program_slug = ? ORDER BY created_at DESC LIMIT 50`,
      args: [roomSlug]
    });
    const chatMessages = chatRes.rows || [];

    // Get program details from Bunny Database sadhana_programs_sql
    let program: any = null;
    let todayVideo: any = null;
    let upcomingVideos: any[] = [];

    const allPrograms = await listPrograms();
    if (activeSchedule?.programSlug) {
      program = allPrograms.find((p: any) => p && p.slug === activeSchedule.programSlug);
    }
    if (!program && allPrograms.length > 0) {
      program = allPrograms[0];
    }

    if (program) {
      const yyyymmdd = now.toISOString().split('T')[0];
      const todayEntry = program.videoCalendar?.[yyyymmdd];
      if (todayEntry) {
        todayVideo = { date: yyyymmdd, title: todayEntry.title || '', videoUrl: todayEntry.hlsUrl || todayEntry.videoUrl || '' };
      }

      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        const entry = program.videoCalendar?.[futureDateStr];
        if (entry) {
          upcomingVideos.push({ date: futureDateStr, title: entry.title || '' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: activeParticipants.length,
      participants: activeParticipants.map((p: any) => ({
        name: p.name,
        joinedAt: p.joined_at || p.joinedAt,
      })),
      program: program ? {
        slug: program.slug,
        name: program.name,
        description: program.description,
        timezone: activeSchedule?.timezone || program.timezone || 'Asia/Kolkata',
        scheduleTime: activeSchedule?.timeSlots?.[0] || program.timeSlots?.[0] || '07:00',
      } : null,
      todayVideo,
      upcomingVideos,
      session: sessionInfo,
      playableVideoUrl,
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
