import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { verifyCommunityTenant } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/crm/community/video-analytics?communityId=...&userId=...
 * Admin-only: per-user/per-video watch-time analytics for a community.
 * - Without userId: summary grouped by member (total watch time, videos watched, quota/usage).
 * - With userId: per-video breakdown + recent session history for that member.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const communityId = request.nextUrl.searchParams.get('communityId');
    const userId = request.nextUrl.searchParams.get('userId');
    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }
    if (!(await verifyCommunityTenant(decoded, communityId))) {
      return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
    }

    await connectDB();
    const { CommunityMember, CommunityVideoWatchLog } = await import('@/lib/db');

    if (userId) {
      // Per-member detail: per-video totals + recent session history
      const member = await CommunityMember.findOne({ communityId, userId }).lean() as any;
      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const perVideo = await CommunityVideoWatchLog.aggregate([
        { $match: { communityId, userId } },
        {
          $group: {
            _id: '$videoId',
            videoTitle: { $last: '$videoTitle' },
            totalWatchSeconds: { $sum: '$watchDuration' },
            sessionCount: { $sum: 1 },
            lastWatched: { $max: '$watchStarted' },
            completedCount: { $sum: { $cond: ['$completed', 1, 0] } },
          },
        },
        { $sort: { lastWatched: -1 } },
      ]);

      const sessions = await CommunityVideoWatchLog.find({ communityId, userId })
        .sort({ watchStarted: -1 })
        .limit(200)
        .select('videoId videoTitle watchStarted watchEnded watchDuration videoPosition totalSeconds completed')
        .lean();

      return NextResponse.json({
        success: true,
        member: {
          userId: member.userId,
          name: member.name,
          status: member.status,
          videoQuota: member.videoQuota || { totalSecondsPerYear: null, perVideoSecondsPerYear: null },
          videoUsage: member.videoUsage || { yearKey: null, totalSeconds: 0, perVideo: {} },
        },
        perVideo,
        sessions,
      });
    }

    // Community-wide summary: total watch time + videos-watched count per member
    const summary = await CommunityVideoWatchLog.aggregate([
      { $match: { communityId } },
      {
        $group: {
          _id: '$userId',
          totalWatchSeconds: { $sum: '$watchDuration' },
          videoCount: { $addToSet: '$videoId' },
          sessionCount: { $sum: 1 },
          lastWatched: { $max: '$watchStarted' },
        },
      },
      {
        $project: {
          userId: '$_id',
          totalWatchSeconds: 1,
          videoCount: { $size: '$videoCount' },
          sessionCount: 1,
          lastWatched: 1,
        },
      },
      { $sort: { totalWatchSeconds: -1 } },
    ]);

    const userIds = summary.map((s: any) => s.userId);
    const members = await CommunityMember.find({ communityId, userId: { $in: userIds } })
      .select('userId name status videoQuota videoUsage')
      .lean();
    const memberMap = new Map(members.map((m: any) => [m.userId, m]));

    const result = summary.map((s: any) => {
      const member = memberMap.get(s.userId);
      return {
        userId: s.userId,
        name: member?.name || 'Unknown',
        status: member?.status || 'unknown',
        totalWatchSeconds: s.totalWatchSeconds,
        videoCount: s.videoCount,
        sessionCount: s.sessionCount,
        lastWatched: s.lastWatched,
        videoQuota: member?.videoQuota || { totalSecondsPerYear: null, perVideoSecondsPerYear: null },
        videoUsage: member?.videoUsage || { yearKey: null, totalSeconds: 0, perVideo: {} },
      };
    });

    return NextResponse.json({ success: true, members: result });
  } catch (error: any) {
    console.error('[Community Video Analytics] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
