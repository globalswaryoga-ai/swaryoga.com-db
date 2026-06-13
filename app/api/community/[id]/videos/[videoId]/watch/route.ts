import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/** Year key for quota resets, e.g. '2026'. */
function getYearKey(now = new Date()): string {
  return String(now.getFullYear());
}

/**
 * GET /api/community/[id]/videos/[videoId]/watch?userId=...
 * Start a watch session: verify membership, create a CommunityVideoWatchLog,
 * and return current quota/usage so the player can warn the user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const { id: communityId, videoId } = await params;
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 });
    }

    await connectDB();
    const { CommunityMember, CommunityVideo, CommunityVideoWatchLog } = await import('@/lib/db');

    const member = await CommunityMember.findOne({ communityId, userId });
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
    }
    if (member.status !== 'active') {
      return NextResponse.json(
        { error: 'Video access suspended', suspended: true, reason: member.metadata?.videoSuspendReason || 'Access suspended' },
        { status: 403 }
      );
    }

    const video = await CommunityVideo.findById(videoId).select('title').lean();
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const watchLog = await CommunityVideoWatchLog.create({
      communityId,
      userId,
      videoId,
      videoTitle: (video as any).title || '',
      watchStarted: new Date(),
      deviceInfo: request.headers.get('user-agent') || '',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
    });

    const yearKey = getYearKey();
    const usage = member.videoUsage?.yearKey === yearKey ? member.videoUsage : { yearKey, totalSeconds: 0, perVideo: {} };

    return NextResponse.json({
      success: true,
      watchLogId: watchLog._id,
      quota: member.videoQuota || { totalSecondsPerYear: null, perVideoSecondsPerYear: null },
      usage: {
        totalSeconds: usage.totalSeconds || 0,
        videoSeconds: (usage.perVideo && usage.perVideo[videoId]) || 0,
      },
    });
  } catch (error: any) {
    console.error('[Community Video Watch GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/community/[id]/videos/[videoId]/watch
 * Heartbeat: append watched seconds to the session log and to the member's
 * yearly usage counters. Auto-suspends the member if a quota is exceeded.
 * Body: { userId, watchLogId, watchedSeconds, videoPosition?, totalSeconds?, completed? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const { id: communityId, videoId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const { userId, watchLogId, videoPosition, totalSeconds, completed } = body;
    const watchedSeconds = Math.max(0, Math.min(120, Number(body.watchedSeconds) || 0)); // clamp one heartbeat to 2 minutes

    if (!userId || !watchLogId) {
      return NextResponse.json({ error: 'userId and watchLogId are required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(watchLogId)) {
      return NextResponse.json({ error: 'Invalid videoId or watchLogId' }, { status: 400 });
    }

    await connectDB();
    const { CommunityMember, CommunityVideoWatchLog } = await import('@/lib/db');

    const member = await CommunityMember.findOne({ communityId, userId });
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
    }

    // Update the session log
    await CommunityVideoWatchLog.updateOne(
      { _id: watchLogId, communityId, userId, videoId },
      {
        $inc: { watchDuration: watchedSeconds },
        $set: {
          watchEnded: new Date(),
          ...(typeof videoPosition === 'number' ? { videoPosition } : {}),
          ...(typeof totalSeconds === 'number' ? { totalSeconds } : {}),
          ...(completed ? { completed: true } : {}),
        },
      }
    );

    // Roll yearly usage counters over if the year changed
    const yearKey = getYearKey();
    if (member.videoUsage?.yearKey !== yearKey) {
      member.videoUsage = { yearKey, totalSeconds: 0, perVideo: {} };
    }
    if (!member.videoUsage.perVideo) member.videoUsage.perVideo = {};

    const prevVideoSeconds = member.videoUsage.perVideo[videoId] || 0;
    member.videoUsage.totalSeconds = (member.videoUsage.totalSeconds || 0) + watchedSeconds;
    member.videoUsage.perVideo[videoId] = prevVideoSeconds + watchedSeconds;
    member.markModified('videoUsage');

    // Enforce quotas (null/undefined = unlimited)
    let suspended = false;
    let suspendReason = '';
    const quota = member.videoQuota || {};
    if (quota.totalSecondsPerYear != null && member.videoUsage.totalSeconds >= quota.totalSecondsPerYear) {
      suspended = true;
      suspendReason = 'Yearly total video watch-time limit reached';
    } else if (quota.perVideoSecondsPerYear != null && member.videoUsage.perVideo[videoId] >= quota.perVideoSecondsPerYear) {
      suspended = true;
      suspendReason = 'Yearly per-video watch-time limit reached';
    }

    if (suspended && member.status === 'active') {
      member.status = 'inactive';
      member.metadata = { ...(member.metadata || {}), videoSuspendReason: suspendReason, videoSuspendedAt: new Date() };
    }

    await member.save();

    return NextResponse.json({
      success: true,
      suspended,
      reason: suspended ? suspendReason : undefined,
      usage: {
        totalSeconds: member.videoUsage.totalSeconds,
        videoSeconds: member.videoUsage.perVideo[videoId],
      },
    });
  } catch (error: any) {
    console.error('[Community Video Watch POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
