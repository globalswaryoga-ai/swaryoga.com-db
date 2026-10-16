/**
 * User Analytics API
 * GET /api/user/analytics - Get learning analytics for user
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  listEnrollmentsByUser,
  getCourseById,
  listWatchLogs,
  listVideos,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const enrollments = await listEnrollmentsByUser(String(userId));
    const activeEnrollments = enrollments.filter((e) => ['active', 'completed'].includes(e.status));

    const analytics = await Promise.all(
      activeEnrollments.map(async (enrollment) => {
        const course = await getCourseById(enrollment.courseId);
        if (!course) return null;

        const [watchLogs, videos] = await Promise.all([
          listWatchLogs(String(userId), course.id),
          listVideos(course.id),
        ]);

        const totalWatchTime = watchLogs.reduce((sum, log) => sum + (log.watchTime || 0), 0);
        const daysActive = new Set(
          watchLogs
            .filter((l) => l.lastWatchedAt)
            .map((l) => l.lastWatchedAt.split('T')[0])
        ).size;

        const watchedCount = enrollment.videosWatched?.length || 0;
        const averageWatchTimePerVideo = watchedCount > 0 ? Math.round(totalWatchTime / watchedCount) : 0;

        const videoMap = new Map<string, any>(videos.map((v) => [v.id, v]));

        const videoWatchStats = watchLogs.map((log) => {
          const video = videoMap.get(log.videoId);
          return {
            videoTitle: (video?.content as any)?.en?.title || log.videoId,
            watchedSeconds: log.watchTime,
            completedWatch: log.completed,
          };
        });

        return {
          courseId: course.id,
          courseTitle: (course.content as any)?.en?.title || course.slug || 'Course',
          progress: enrollment.progressPercent || 0,
          totalWatchTime,
          videosWatched: watchedCount,
          totalVideos: videos.length,
          averageWatchTimePerVideo,
          completionRate: enrollment.progressPercent || 0,
          daysActive,
          lastWatchedDate: enrollment.updatedAt || enrollment.enrolledAt,
          watchTimePerDay: [],
          videoWatchStats,
        };
      })
    );

    const validAnalytics = analytics.filter(Boolean);

    return NextResponse.json({
      success: true,
      data: validAnalytics,
    });

  } catch (error: any) {
    console.error('[User Analytics Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
