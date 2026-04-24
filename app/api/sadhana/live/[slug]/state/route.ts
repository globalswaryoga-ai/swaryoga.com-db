import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import {
  getProgramsCollection,
  getProgramVideosCollection,
  getProgramsDb,
  computeProgramSession,
  buildVideoUrlWithOffset,
  todayInTimezone,
} from '@/lib/sadhanaPrograms';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { sessionId } = await request.json();
    const db = await getProgramsDb();
    const programs = await getProgramsCollection();
    const videos = await getProgramVideosCollection();
    const participants = db.collection('sadhana_live_participants');
    const chatCol = db.collection('sadhana_live_chat');

    const program = await programs.findOne({ slug: params.slug });
    if (!program) {
      return NextResponse.json({ error: 'Program not found', slug: params.slug }, { status: 404 });
    }

    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 15 * 1000);

    if (sessionId) {
      await participants.updateOne(
        { sessionId, programSlug: params.slug },
        { $set: { lastSeen: now } }
      );
    }

    await participants.deleteMany({
      programSlug: params.slug,
      lastSeen: { $lt: activeThreshold },
    });

    const activeParticipants = await participants
      .find({ programSlug: params.slug, lastSeen: { $gte: activeThreshold } })
      .sort({ joinedAt: 1 })
      .limit(200)
      .toArray();

    const todayDate = todayInTimezone(now, program.timezone);
    const todayVideo = await videos.findOne({
      programId: program._id.toString(),
      date: todayDate,
    });

    // Find next upcoming video if no session today or session ended
    const upcomingVideos = await videos
      .find({ programId: program._id.toString(), date: { $gte: todayDate } })
      .sort({ date: 1 })
      .limit(5)
      .toArray();

    const sessionInfo = computeProgramSession(program as any, todayVideo as any, now);

    // If no session today, show next upcoming video's date as nextSessionUtc
    if (!todayVideo && upcomingVideos.length > 0) {
      const next = upcomingVideos[0];
      const [h, m] = program.scheduleTime.split(':').map(Number);
      const iso = `${next.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const { zonedTimeToUtc } = await import('@/lib/sadhanaPrograms');
      sessionInfo.nextSessionUtc = zonedTimeToUtc(iso, program.timezone).toISOString();
    }

    let playableVideoUrl: string | null = null;
    if (sessionInfo.status === 'live' && todayVideo) {
      playableVideoUrl = buildVideoUrlWithOffset(todayVideo.videoUrl, sessionInfo.videoOffsetSeconds);
    }

    const chatMessages = await chatCol
      .find({ programSlug: params.slug })
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
        slug: program.slug,
        name: program.name,
        description: program.description,
        timezone: program.timezone,
        scheduleTime: program.scheduleTime,
      },
      todayVideo: todayVideo
        ? {
            date: todayVideo.date,
            title: todayVideo.title,
            videoUrl: todayVideo.videoUrl,
          }
        : null,
      upcomingVideos: upcomingVideos.slice(1).map((v: any) => ({
        date: v.date,
        title: v.title,
      })),
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
