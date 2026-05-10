/**
 * User Analytics API
 * GET /api/user/analytics - Get learning analytics for user
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCourseEnrollment, getRecordedCourse, getVideoWatchLog } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const timeframe = request.nextUrl.searchParams.get('timeframe') || 'month';

    const CourseEnrollment = getCourseEnrollment();
    const RecordedCourse = getRecordedCourse();
    const VideoWatchLog = getVideoWatchLog();

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate = new Date(0); // All time
    }

    // Get user enrollments
    const enrollments = await CourseEnrollment.find({
      userId: userId,
    }).populate('courseId');

    // Build analytics for each course
    const analytics = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const course = enrollment.courseId;
        const courseId = course._id;

        // Get watch logs for this course in the timeframe
        const watchLogs = await VideoWatchLog.find({
          userId: userId,
          courseId: courseId,
          startTime: { $gte: startDate },
        });

        // Calculate stats
        const totalWatchTime = watchLogs.reduce((sum: number, log: any) => {
          return sum + (log.watchedSeconds || 0);
        }, 0);

        const daysActive = new Set(
          watchLogs.map((log: any) => log.startTime.toISOString().split('T')[0])
        ).size;

        const averageWatchTimePerVideo = enrollment.videosWatched?.length > 0
          ? totalWatchTime / enrollment.videosWatched.length
          : 0;

        // Get video-specific watch stats
        const videoWatchStats = await Promise.all(
          (enrollment.videosWatched || []).map(async (videoId: any) => {
            const logs = await VideoWatchLog.findOne({
              userId: userId,
              videoId: videoId,
            })
              .populate('videoId', 'content duration')
              .sort({ createdAt: -1 });

            return {
              videoTitle: logs?.videoId?.content?.en?.title || 'Video',
              watchedSeconds: logs?.watchedSeconds || 0,
              completedWatch: logs?.completedWatch || false,
            };
          })
        );

        return {
          courseId: courseId.toString(),
          courseTitle: course.content?.en?.title || course.title || 'Course',
          progress: enrollment.progress || 0,
          totalWatchTime,
          videosWatched: enrollment.videosWatched?.length || 0,
          totalVideos: course.totalVideos || 0,
          averageWatchTimePerVideo,
          completionRate: enrollment.progress || 0,
          daysActive,
          lastWatchedDate: enrollment.lastWatchedAt || enrollment.enrolledAt,
          watchTimePerDay: [], // Can be calculated if needed
          videoWatchStats,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: analytics.filter((a) => a.totalWatchTime > 0 || a.videosWatched > 0),
    });

  } catch (error: any) {
    console.error('[User Analytics Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
