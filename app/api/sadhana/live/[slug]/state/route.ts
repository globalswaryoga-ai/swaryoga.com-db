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
  const controls = `${start || autoplay ? '&' : sep}controls=false`;
  const noDownload = `&token=restricted`;
  return `${videoUrl}${autoplay}${start}${controls}${noDownload}`;
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { sessionId } = await request.json();
    console.log(`[Sadhana Live] ${params.slug} - Session state requested`, { sessionId, time: new Date().toISOString() });
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
      .find({ programSlug: params.slug, lastSeen: { $gte: activeThreshold } })
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

    // Fallback: if no schedule, try to find program directly and use it as schedule
    if (!activeSchedule) {
      try {
        const programsDb = await getProgramsDb();
        const programsCol = programsDb.collection('sadhana_programs');
        const program = await programsCol.findOne({ slug: params.slug });
        if (program) {
          activeSchedule = {
            _id: program._id,
            slug: program.slug,
            name: program.name,
            description: program.description,
            programSlug: program.slug,
            timeSlots: program.timeSlots,
            timezone: program.timezone,
            videoDuration: program.videoDuration,
            countdownMinutes: program.countdownMinutes,
            days: program.days,
            startDate: program.startDate,
            botName: program.botName,
            botJoinMinutes: program.botJoinMinutes,
            enableBotAutomation: program.enableBotAutomation,
            playerMode: program.playerMode || 'player',
            playerUrl: program.playerUrl || '',
            videoCalendar: program.videoCalendar || {},
          };
        }
      } catch {
        activeSchedule = null;
      }
    }

    if (!activeSchedule) {
      console.log(`[Sadhana Live] ${params.slug} - Program not found`);
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    console.log(`[Sadhana Live] ${params.slug} - Program found`, {
      name: activeSchedule.name,
      playerMode: activeSchedule.playerMode,
      hasVideoUrl: !!activeSchedule.videoUrl,
      hasPlayerUrl: !!activeSchedule.playerUrl,
    });

    let sessionInfo: any = null;
    let playableVideoUrl = null;
    if (activeSchedule) {
      sessionInfo = computeSessionStatus(activeSchedule, now);

      // Get video URL for playback - try schedule first, then program calendar
      let videoUrlForPlayback = activeSchedule.videoUrl;
      console.log(`[Sadhana Live] ${params.slug} - Looking for video`, { status: sessionInfo.status, hasScheduleUrl: !!videoUrlForPlayback });

      if (!videoUrlForPlayback) {
        try {
          const programsDb = await getProgramsDb();
          const programsCol = programsDb.collection('sadhana_programs');
          // Try to find program by programSlug or slug
          const program = await programsCol.findOne({
            $or: [
              { slug: activeSchedule.programSlug || activeSchedule.slug },
              { slug: params.slug }
            ]
          });

          if (program?.videoCalendar) {
            const tz = activeSchedule.timezone || 'Asia/Kolkata';
            const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
            const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
            const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
            const yyyymmdd = `${y}-${mo}-${d}`;
            const todayEntry = program.videoCalendar[yyyymmdd];
            const playerMode = activeSchedule.playerMode || 'player';
            if (playerMode === 'hls' && todayEntry?.hlsUrl) {
              videoUrlForPlayback = todayEntry.hlsUrl;
              console.log(`[Sadhana Live] ${params.slug} - Using HLS URL from calendar`);
            } else if (todayEntry?.videoUrl) {
              videoUrlForPlayback = todayEntry.videoUrl;
              console.log(`[Sadhana Live] ${params.slug} - Using Player URL from calendar`);
            } else {
              console.log(`[Sadhana Live] ${params.slug} - Calendar entry has no valid URL`, { playerMode, hasHls: !!todayEntry?.hlsUrl, hasPlayer: !!todayEntry?.videoUrl });
            }
          }
        } catch (err) {
          console.error('Error fetching video from calendar:', err);
        }
      }

      if (sessionInfo.status === 'live' && videoUrlForPlayback && videoUrlForPlayback.startsWith('http')) {
        playableVideoUrl = buildVideoUrlWithOffset(
          videoUrlForPlayback,
          sessionInfo.videoOffsetSeconds
        );
      }
    }

    // Auto-add bot botJoinMinutes before session starts, keep lastSeen updated
    if (activeSchedule && sessionInfo && activeSchedule.enableBotAutomation !== false && sessionInfo.sessionStartUtc) {
      const botJoinMinutes = activeSchedule.botJoinMinutes || 5;
      const sessionStart = new Date(sessionInfo.sessionStartUtc).getTime();
      const botJoinTime = sessionStart - (botJoinMinutes * 60 * 1000);
      const shouldBotBeActive = now.getTime() >= botJoinTime && sessionInfo.status !== 'ended';

      const botName = activeSchedule.botName || '🤖 Swar Yoga Bot';
      const botExists = await participants.findOne({
        programSlug: params.slug,
        name: botName
      });

      if (shouldBotBeActive && !botExists) {
        await participants.insertOne({
          programSlug: params.slug,
          name: botName,
          sessionId: 'bot',
          joinedAt: now,
          lastSeen: now,
        });
        // Bot welcome message in chat
        await chatCol.insertOne({
          programSlug: params.slug,
          name: botName,
          message: `Namaste! 🙏 ${activeSchedule.name || 'Session'} starting soon. Welcome everyone!`,
          createdAt: now,
        });
      } else if (shouldBotBeActive && botExists) {
        // Keep bot's lastSeen updated so it doesn't get deleted
        await participants.updateOne(
          { programSlug: params.slug, name: botName },
          { $set: { lastSeen: now } }
        );
      } else if (!shouldBotBeActive && botExists) {
        // Remove bot after session ends
        await participants.deleteOne({
          programSlug: params.slug,
          name: botName
        });
        // Bot farewell message
        await chatCol.insertOne({
          programSlug: params.slug,
          name: botName,
          message: 'Thank you for practicing! See you next session. 🙏',
          createdAt: now,
        });
      }
    }

    // Get chat for today only (last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const chatMessages = await chatCol
      .find({ createdAt: { $gte: oneDayAgo } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get todayVideo from program calendar or schedule videoUrl
    let todayVideo = null;
    let upcomingVideos: any[] = [];
    if (activeSchedule?.slug) {
      try {
        const programsDb = await getProgramsDb();
        const programsCol = programsDb.collection('sadhana_programs');
        const program = await programsCol.findOne({ slug: activeSchedule.slug });

        if (program?.videoCalendar) {
          const tz = activeSchedule.timezone || 'Asia/Kolkata';
          const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
          const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
          const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
          const yyyymmdd = `${y}-${mo}-${d}`;
          const todayEntry = program.videoCalendar?.[yyyymmdd];
          if (todayEntry) {
            let playerMode = activeSchedule.playerMode || 'player';
            // Fallback: if playerMode is 'player' but only hlsUrl is available, switch to HLS mode
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

          // Get next 7 days of videos
          for (let i = 1; i <= 7; i++) {
            const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            const fy = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(futureDate);
            const fmo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(futureDate);
            const fd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(futureDate);
            const futureDateStr = `${fy}-${fmo}-${fd}`;
            const entry = program.videoCalendar?.[futureDateStr];
            if (entry) {
              upcomingVideos.push({ date: futureDateStr, title: entry.title });
            }
          }
        }
      } catch (err) {
        // Fallback to videoUrl if calendar not available
      }
    }

    // Fallback to schedule videoUrl if no calendar
    if (!todayVideo && activeSchedule?.videoUrl) {
      todayVideo = {
        title: activeSchedule.name || 'Session',
        videoUrl: activeSchedule.videoUrl,
      };
    }

    // Determine playerMode with fallback: if only hlsUrl available, use HLS
    let playerMode = activeSchedule?.playerMode || 'player';
    let playerUrl = activeSchedule?.playerUrl || '';

    // Secondary fallback: check if we need to switch to HLS mode based on available URLs
    if (playerMode === 'player' && !playerUrl && sessionInfo.status === 'live') {
      try {
        const programsDb = await getProgramsDb();
        const programsCol = programsDb.collection('sadhana_programs');
        const program = await programsCol.findOne({ slug: activeSchedule.slug });
        if (program?.videoCalendar) {
          const tz = activeSchedule.timezone || 'Asia/Kolkata';
          const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(now);
          const mo = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(now);
          const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(now);
          const yyyymmdd = `${y}-${mo}-${d}`;
          const entry = program.videoCalendar?.[yyyymmdd];
          if (entry?.hlsUrl && !entry.videoUrl) {
            playerMode = 'hls';
            playerUrl = entry.hlsUrl;
          }
        }
      } catch {
        // Fallback attempt failed, continue
      }
    }

    const validPlayerUrl = playerUrl && playerUrl.startsWith('http') ? playerUrl : '';

    console.log(`[Sadhana Live] ${params.slug} - Returning response`, {
      status: sessionInfo.status,
      playerMode,
      hasPlayableUrl: !!playableVideoUrl,
      hasPlayerUrl: !!validPlayerUrl,
      participants: activeParticipants.length,
    });

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
      todayVideo,
      upcomingVideos,
      session: sessionInfo,
      playableVideoUrl,
      playerMode,
      playerUrl: validPlayerUrl,
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
