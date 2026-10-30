import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getProgram, getProgramVideoByDate, listProgramVideos, initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';

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
  // Upload and open time should be minimal (1 min default or whatever is set)
  const countdownMin = Math.max(0, Number(schedule.countdownMinutes) ?? 1);
  const allowedDays = schedule.days || [0, 1, 2, 3, 4, 5, 6];
  const startDate = schedule.startDate ? new Date(schedule.startDate) : null;

  const candidates: { startUtc: Date; endUtc: Date; dayOffset: number }[] = [];

  // Check from yesterday (-1) to next 7 days (+7) so recent & ongoing sessions are caught
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

function buildVideoUrlWithOffset(videoUrl: string, offsetSeconds: number): string {
  if (!videoUrl) return videoUrl;
  const sep = videoUrl.includes('?') ? '&' : '?';
  const autoplay = videoUrl.includes('autoplay') ? '' : `${sep}autoplay=true`;
  const start = offsetSeconds > 0 ? `${autoplay ? '&' : sep}t=${offsetSeconds}` : '';
  return `${videoUrl}${autoplay}${start}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const resolved = params instanceof Promise ? await params : params;
  return handleStateRequest(request, resolved, null);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const body = await request.json().catch(() => ({}));
    return handleStateRequest(request, resolved, body);
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/[slug]/state');
  }
}

let lastCleanup = 0;

async function handleStateRequest(request: NextRequest, params: { slug: string }, body: any) {
  try {
    const sessionId = body?.sessionId;
    const isPreview = request.nextUrl.searchParams.get('preview') === '1' ||
                      request.nextUrl.searchParams.get('test') === '1' ||
                      body?.preview === true;

    await initSadhanaBunnySchema();
    const now = new Date();
    // 120s tolerance (2 minutes) so fluctuating mobile / train networks do not drop participants
    const activeThreshold = new Date(now.getTime() - 120 * 1000);
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

    // Only clean stale participants once every 30s instead of on every 3s request
    if (now.getTime() - lastCleanup > 30_000) {
      lastCleanup = now.getTime();
      bunnyExecute({
        sql: `DELETE FROM sadhana_live_participants_sql WHERE program_slug = ? AND last_seen < ?`,
        args: [params.slug, thresholdIso]
      }).catch(() => {});
    }

    const activeParticipants = (await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_participants_sql WHERE program_slug = ? AND last_seen >= ? ORDER BY joined_at ASC LIMIT 200`,
      args: [params.slug, thresholdIso]
    })).rows || [];

    // Real-time lookup with ZERO stale cache so schedule updates apply instantly
    const activeSchedule = await getProgram(params.slug);

    if (!activeSchedule) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Convert program format to schedule format for computeSessionStatus
    const scheduleFmt = {
      ...activeSchedule,
      timezone: activeSchedule.timezone || 'Asia/Kolkata',
      timeSlots: activeSchedule.timeSlots,
      videoDuration: activeSchedule.videoDuration || 32,
      countdownMinutes: activeSchedule.countdownMinutes || 1,
      days: activeSchedule.days || [0, 1, 2, 3, 4, 5, 6],
      startDate: activeSchedule.startDate,
      videoUrl: activeSchedule.playerUrl
    };

    let sessionInfo = computeSessionStatus(scheduleFmt, now);

    // If preview mode requested, force status to live with 0 offset
    if (isPreview) {
      sessionInfo = {
        ...sessionInfo,
        status: 'live',
        sessionStartUtc: nowIso,
        sessionEndUtc: new Date(now.getTime() + (activeSchedule.videoDuration || 32) * 60 * 1000).toISOString(),
        videoOffsetSeconds: 0,
      };
    }

    // Determine today's date in program timezone
    const tz = activeSchedule.timezone || 'Asia/Kolkata';
    const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
    const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
    const yyyymmdd = `${y}-${mo}-${d}`;

    // 1. Fetch today's video directly from sadhana_program_videos_sql
    const dbTodayVideo = await getProgramVideoByDate(activeSchedule.id, yyyymmdd);

    // 2. Fetch all program videos for upcoming list & fallback to latest video
    const allProgramVideos = await listProgramVideos(activeSchedule.id);
    const latestUploadedVideo = allProgramVideos.length > 0 ? allProgramVideos[allProgramVideos.length - 1] : null;

    const todayEntry = activeSchedule.videoCalendar ? activeSchedule.videoCalendar[yyyymmdd] : null;
    const effectiveVideoObj = dbTodayVideo || todayEntry || latestUploadedVideo;

    // Resolve today's effective video URL (DB today video -> calendar entry -> playerUrl -> latest video)
    const rawVideoUrl = (
      (dbTodayVideo ? (dbTodayVideo.hlsUrl || dbTodayVideo.videoUrl) : '') ||
      (todayEntry ? (todayEntry.hlsUrl || todayEntry.videoUrl) : '') ||
      activeSchedule.playerUrl ||
      (latestUploadedVideo ? (latestUploadedVideo.hlsUrl || latestUploadedVideo.videoUrl) : '') ||
      ''
    ).trim();

    // Auto-detect HLS if URL is m3u8, b-cdn.net playlist, or if playerMode was set to hls
    const isHls = rawVideoUrl.includes('.m3u8') ||
                  rawVideoUrl.includes('b-cdn.net') ||
                  rawVideoUrl.includes('playlist') ||
                  activeSchedule.playerMode === 'hls';

    const playerMode: 'hls' | 'player' = isHls ? 'hls' : (activeSchedule.playerMode === 'hls' ? 'hls' : 'player');
    const playerUrl = rawVideoUrl;
    let playableVideoUrl: string | null = null;

    if ((sessionInfo.status === 'live' || isPreview) && rawVideoUrl) {
      if (playerMode === 'hls') {
        playableVideoUrl = rawVideoUrl;
      } else {
        playableVideoUrl = buildVideoUrlWithOffset(rawVideoUrl, sessionInfo.videoOffsetSeconds);
      }
    }

    // Bot logic with concurrency locks & spam prevention
    if (activeSchedule.enableBotAutomation !== false && sessionInfo.sessionStartUtc) {
      try {
        const botJoinMinutes = activeSchedule.botJoinMinutes || 5;
        const sessionStart = new Date(sessionInfo.sessionStartUtc).getTime();
        const botJoinTime = sessionStart - (botJoinMinutes * 60 * 1000);
        const shouldBotBeActive = now.getTime() >= botJoinTime && sessionInfo.status !== 'ended';
        const botName = activeSchedule.botName || '🤖 Swar Yoga Bot';

        const botExistsRes = await bunnyExecute({
          sql: `SELECT 1 FROM sadhana_live_participants_sql WHERE program_slug = ? AND name = ? LIMIT 1`,
          args: [params.slug, botName]
        }).catch(() => ({ rows: [] }));
        const botExists = botExistsRes.rows.length > 0;

        if (shouldBotBeActive && !botExists) {
          const botParticipantId = `bot_${params.slug}_${Date.now()}`;
          await bunnyExecute({
            sql: `INSERT OR IGNORE INTO sadhana_live_participants_sql (id, session_id, program_slug, name, joined_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)`,
            args: [botParticipantId, 'bot', params.slug, botName, nowIso, nowIso]
          }).catch(() => {});

          // Only send welcome chat message if no bot message was sent in last 15 mins
          const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
          const recentMsg = await bunnyExecute({
            sql: `SELECT id FROM sadhana_live_chat_sql WHERE program_slug = ? AND sender = ? AND created_at >= ? LIMIT 1`,
            args: [params.slug, botName, fifteenMinsAgo]
          }).catch(() => ({ rows: [] }));

          if (recentMsg.rows.length === 0) {
            const crypto = require('crypto');
            const msgId = crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}`;
            await bunnyExecute({
              sql: `INSERT INTO sadhana_live_chat_sql (id, program_slug, session_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
              args: [msgId, params.slug, 'bot', botName, `Namaste! 🙏 ${activeSchedule.name || 'Session'} starting soon. Welcome everyone!`, nowIso]
            }).catch(() => {});
          }
        } else if (shouldBotBeActive && botExists) {
          await bunnyExecute({
            sql: `UPDATE sadhana_live_participants_sql SET last_seen = ? WHERE program_slug = ? AND name = ?`,
            args: [nowIso, params.slug, botName]
          }).catch(() => {});
        } else if (!shouldBotBeActive && botExists) {
          await bunnyExecute({
            sql: `DELETE FROM sadhana_live_participants_sql WHERE program_slug = ? AND name = ?`,
            args: [params.slug, botName]
          }).catch(() => {});

          // Only send farewell chat message if not already sent in last 15 mins
          const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
          const recentMsg = await bunnyExecute({
            sql: `SELECT id FROM sadhana_live_chat_sql WHERE program_slug = ? AND sender = ? AND message LIKE '%Thank you for practicing%' AND created_at >= ? LIMIT 1`,
            args: [params.slug, botName, fifteenMinsAgo]
          }).catch(() => ({ rows: [] }));

          if (recentMsg.rows.length === 0) {
            const crypto = require('crypto');
            const msgId = crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}`;
            await bunnyExecute({
              sql: `INSERT INTO sadhana_live_chat_sql (id, program_slug, session_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
              args: [msgId, params.slug, 'bot', botName, 'Thank you for practicing! See you next session. 🙏', nowIso]
            }).catch(() => {});
          }
        }
      } catch (botErr) {
        // Log bot error safely without failing user playback state
        console.warn('[SadhanaState] Safe catch in bot handler:', botErr);
      }
    }

    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const chatMessages = (await bunnyExecute({
      sql: `SELECT * FROM sadhana_live_chat_sql WHERE program_slug = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 50`,
      args: [params.slug, oneDayAgo]
    })).rows || [];

    const todaysJoins = (await bunnyExecute({
      sql: `SELECT * FROM sadhana_join_history_sql WHERE program_slug = ? AND joined_at >= ? ORDER BY joined_at ASC LIMIT 500`,
      args: [params.slug, oneDayAgo]
    })).rows || [];

    const todayTitle = (effectiveVideoObj?.title && effectiveVideoObj.title.trim()) || activeSchedule.name || 'Daily Sadhana Practice';
    let todayVideo: any = null;
    if (rawVideoUrl) {
      todayVideo = {
        date: effectiveVideoObj?.date || yyyymmdd,
        title: todayTitle,
        videoUrl: rawVideoUrl,
        hlsUrl: isHls ? rawVideoUrl : null,
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
            title: (v.title && v.title.trim()) || activeSchedule.name || 'Daily Practice'
          });
        });
    } else if (activeSchedule.videoCalendar) {
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const fy = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(futureDate);
        const fmo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(futureDate);
        const fd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(futureDate);
        const futureDateStr = `${fy}-${fmo}-${fd}`;
        const entry = activeSchedule.videoCalendar[futureDateStr];
        if (entry) {
          upcomingVideos.push({
            date: futureDateStr,
            title: (entry.title && entry.title.trim()) || activeSchedule.name || 'Daily Practice'
          });
        }
      }
    }

    const timeSlots = activeSchedule.timeSlots || ((activeSchedule as any).scheduleTime ? [(activeSchedule as any).scheduleTime] : []);

    return NextResponse.json({
      success: true,
      count: activeParticipants.length,
      participants: activeParticipants.map((p: any) => ({ name: p.name, joinedAt: p.joined_at })),
      todaysParticipants: todaysJoins.map((p: any) => ({ name: p.name, joinedAt: p.joined_at })),
      program: {
        slug: params.slug,
        name: activeSchedule.name || 'Sadhana Live',
        description: activeSchedule.description || '',
        timezone: activeSchedule.timezone || 'Asia/Kolkata',
        scheduleTime: timeSlots,
        timeSlots: timeSlots,
        videoDuration: activeSchedule.videoDuration || 32,
        countdownMinutes: activeSchedule.countdownMinutes || 5,
      },
      todayVideo,
      upcomingVideos,
      session: sessionInfo,
      playableVideoUrl: playableVideoUrl || playerUrl,
      playerMode,
      playerUrl,
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
