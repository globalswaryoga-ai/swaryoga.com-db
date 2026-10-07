import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { listPrograms, initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';
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
    console.log(`[Sadhana Live] ${params.slug} - Session state requested`, { sessionId, time: new Date().toISOString() });

    await initSadhanaBunnySchema();
    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 15 * 1000);
    const nowIso = now.toISOString();
    const thresholdIso = activeThreshold.toISOString();

    if (sessionId) {
      await bunnyExecute({
        sql: `UPDATE sadhana_live_participants_sql SET last_seen = ? WHERE session_id = ? AND program_slug = ?`,
        args: [nowIso, sessionId, params.slug]
      });
      await bunnyExecute({
        sql: `UPDATE sadhana_join_history_sql SET left_at = ? WHERE session_id = ? AND program_slug = ?`,
        args: [nowIso, sessionId, params.slug]
      });
    }

    await bunnyExecute({
      sql: `DELETE FROM sadhana_live_participants_sql WHERE program_slug = ? AND last_seen < ?`,
      args: [params.slug, thresholdIso]
    });

    const activeParticipants = (await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_participants_sql WHERE program_slug = ? AND last_seen >= ? ORDER BY joined_at ASC LIMIT 200`,
      args: [params.slug, thresholdIso]
    })).rows || [];

    const allPrograms = await listPrograms();
    let activeSchedule = allPrograms.find(p => p && p.slug === params.slug);

    if (!activeSchedule) {
      console.log(`[Sadhana Live] ${params.slug} - Program not found`);
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    console.log(`[Sadhana Live] ${params.slug} - Program found`, {
      name: activeSchedule.name,
      playerMode: activeSchedule.playerMode,
      hasVideoUrl: !!activeSchedule.playerUrl,
    });

    let sessionInfo: any = null;
    let playableVideoUrl: any = null;
    
    // Convert program format to old schedule format for computeSessionStatus
    const scheduleFmt = {
      ...activeSchedule,
      timezone: activeSchedule.timezone || 'Asia/Kolkata',
      timeSlots: activeSchedule.timeSlots,
      videoDuration: activeSchedule.videoDuration,
      countdownMinutes: activeSchedule.countdownMinutes || 5,
      days: activeSchedule.days || [0, 1, 2, 3, 4, 5, 6],
      startDate: activeSchedule.startDate,
      videoUrl: activeSchedule.playerUrl
    };

    sessionInfo = computeSessionStatus(scheduleFmt, now);
    let videoUrlForPlayback = activeSchedule.playerUrl;
    
    if (!videoUrlForPlayback && activeSchedule.videoCalendar) {
      try {
        const tz = activeSchedule.timezone || 'Asia/Kolkata';
        const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
        const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
        const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
        const yyyymmdd = `${y}-${mo}-${d}`;
        const todayEntry = activeSchedule.videoCalendar[yyyymmdd];
        
        if (todayEntry) {
          const playerMode = activeSchedule.playerMode || 'player';
          if (playerMode === 'hls' && todayEntry.hlsUrl) {
            videoUrlForPlayback = todayEntry.hlsUrl;
          } else if (todayEntry.videoUrl) {
            videoUrlForPlayback = todayEntry.videoUrl;
          }
        }
      } catch (err) {
        console.error('Error fetching video from calendar:', err);
      }
    }

    if (sessionInfo.status === 'live' && videoUrlForPlayback && videoUrlForPlayback.startsWith('http')) {
      playableVideoUrl = buildVideoUrlWithOffset(videoUrlForPlayback, sessionInfo.videoOffsetSeconds);
    }

    // Bot logic
    if (activeSchedule.enableBotAutomation !== false && sessionInfo.sessionStartUtc) {
      const botJoinMinutes = activeSchedule.botJoinMinutes || 5;
      const sessionStart = new Date(sessionInfo.sessionStartUtc).getTime();
      const botJoinTime = sessionStart - (botJoinMinutes * 60 * 1000);
      const shouldBotBeActive = now.getTime() >= botJoinTime && sessionInfo.status !== 'ended';

      const botName = activeSchedule.botName || '🤖 Swar Yoga Bot';
      const botExistsRes = await bunnyExecute({
        sql: `SELECT 1 FROM sadhana_live_participants_sql WHERE program_slug = ? AND name = ?`,
        args: [params.slug, botName]
      });
      const botExists = botExistsRes.rows.length > 0;

      if (shouldBotBeActive && !botExists) {
        await bunnyExecute({
          sql: `INSERT INTO sadhana_live_participants_sql (session_id, program_slug, name, joined_at, last_seen) VALUES (?, ?, ?, ?, ?)`,
          args: ['bot', params.slug, botName, nowIso, nowIso]
        });
        const msgId = require('crypto').randomUUID();
        await bunnyExecute({
          sql: `INSERT INTO sadhana_live_chat_sql (id, program_slug, session_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [msgId, params.slug, 'bot', botName, `Namaste! 🙏 ${activeSchedule.name || 'Session'} starting soon. Welcome everyone!`, nowIso]
        });
      } else if (shouldBotBeActive && botExists) {
        await bunnyExecute({
          sql: `UPDATE sadhana_live_participants_sql SET last_seen = ? WHERE program_slug = ? AND name = ?`,
          args: [nowIso, params.slug, botName]
        });
      } else if (!shouldBotBeActive && botExists) {
        await bunnyExecute({
          sql: `DELETE FROM sadhana_live_participants_sql WHERE program_slug = ? AND name = ?`,
          args: [params.slug, botName]
        });
        const msgId = require('crypto').randomUUID();
        await bunnyExecute({
          sql: `INSERT INTO sadhana_live_chat_sql (id, program_slug, session_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [msgId, params.slug, 'bot', botName, 'Thank you for practicing! See you next session. 🙏', nowIso]
        });
      }
    }

    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const chatMessages = (await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_chat_sql WHERE created_at >= ? ORDER BY created_at DESC LIMIT 50`,
      args: [oneDayAgo]
    })).rows || [];

    const todaysJoins = (await bunnyExecute({
      sql: `SELECT * FROM sadhana_join_history_sql WHERE program_slug = ? AND joined_at >= ? ORDER BY joined_at ASC LIMIT 500`,
      args: [params.slug, oneDayAgo]
    })).rows || [];

    let todayVideo: any = null;
    let upcomingVideos: any[] = [];
    if (activeSchedule.videoCalendar) {
      const tz = activeSchedule.timezone || 'Asia/Kolkata';
      const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
      const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
      const yyyymmdd = `${y}-${mo}-${d}`;
      const todayEntry = activeSchedule.videoCalendar[yyyymmdd];
      
      if (todayEntry) {
        let playerMode = activeSchedule.playerMode || 'player';
        if (playerMode === 'player' && !todayEntry.videoUrl && todayEntry.hlsUrl) {
          playerMode = 'hls';
          if (sessionInfo.status === 'live') {
            activeSchedule.playerMode = 'hls';
            activeSchedule.playerUrl = todayEntry.hlsUrl;
          }
        }
        const url = playerMode === 'hls' && todayEntry.hlsUrl ? todayEntry.hlsUrl : todayEntry.videoUrl;
        todayVideo = { date: yyyymmdd, title: todayEntry.title, videoUrl: url };
      }

      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const fy = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(futureDate);
        const fmo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(futureDate);
        const fd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(futureDate);
        const futureDateStr = `${fy}-${fmo}-${fd}`;
        const entry = activeSchedule.videoCalendar[futureDateStr];
        if (entry) upcomingVideos.push({ date: futureDateStr, title: entry.title });
      }
    }

    if (!todayVideo && activeSchedule.playerUrl) {
      todayVideo = { title: activeSchedule.name || 'Session', videoUrl: activeSchedule.playerUrl };
    }

    let playerMode = activeSchedule.playerMode || 'player';
    let playerUrl = activeSchedule.playerUrl || '';

    const validPlayerUrl = playerUrl && playerUrl.startsWith('http') ? playerUrl : '';

    return NextResponse.json({
      success: true,
      count: activeParticipants.length,
      participants: activeParticipants.map((p: any) => ({ name: p.name, joinedAt: p.joined_at })),
      todaysParticipants: todaysJoins.map((p: any) => ({ name: p.name, joinedAt: p.joined_at })),
      program: { slug: params.slug, name: activeSchedule.name || 'Sadhana Live', timezone: activeSchedule.timezone || 'Asia/Kolkata' },
      todayVideo,
      upcomingVideos,
      session: sessionInfo,
      playableVideoUrl,
      playerMode,
      playerUrl: validPlayerUrl,
      chat: chatMessages.reverse().map((m: any) => ({
        id: m.id,
        name: m.sender,
        message: m.message,
        createdAt: m.created_at,
      })),
      serverTime: nowIso,
    });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/[slug]/state');
  }
}
