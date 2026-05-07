/**
 * Admin API for E-Learning Analytics
 * GET /api/admin/e-learning/analytics - Get overall stats
 * GET /api/admin/e-learning/analytics?courseId=... - Course specific stats
 * GET /api/admin/e-learning/analytics?userId=... - User specific stats
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCourseEnrollment, getRecordedCourse, getVideoWatchLog } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - Get analytics data
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const courseId = request.nextUrl.searchParams.get('courseId');
    const userId = request.nextUrl.searchParams.get('userId');

    const CourseEnrollment = getCourseEnrollment();
    const RecordedCourse = getRecordedCourse();
    const VideoWatchLog = getVideoWatchLog();

    // Overall stats
    if (!courseId && !userId) {
      const totalEnrollments = await CourseEnrollment.countDocuments();
      const activeEnrollments = await CourseEnrollment.countDocuments({ status: 'active' });
      const completedEnrollments = await CourseEnrollment.countDocuments({ status: 'completed' });
      const totalCourses = await RecordedCourse.countDocuments({ isPublished: true });

      const watchLogs = await VideoWatchLog.aggregate([
        {
          $group: {
            _id: null,
            totalWatchTime: { $sum: '$watchDuration' },
            totalSessions: { $sum: 1 },
          },
        },
      ]);

      const enrollmentStats = await CourseEnrollment.aggregate([
        {
          $group: {
            _id: null,
            avgProgress: { $avg: '$progress' },
            totalWatchTime: { $sum: '$totalWatchTime' },
          },
        },
      ]);

      return NextResponse.json({
        success: true,
        stats: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          totalCourses,
          avgProgress: enrollmentStats[0]?.avgProgress || 0,
          totalWatchTime: enrollmentStats[0]?.totalWatchTime || 0,
          totalWatchSessions: watchLogs[0]?.totalSessions || 0,
        },
      });
    }

    // Course specific stats
    if (courseId) {
      const course = await RecordedCourse.findById(courseId);
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const enrollments = await CourseEnrollment.find({ courseId }).populate('userId', 'name email');
      const totalEnrolled = enrollments.length;
      const completed = enrollments.filter((e: any) => e.status === 'completed').length;
      const active = enrollments.filter((e: any) => e.status === 'active').length;
      const avgProgress = enrollments.reduce((sum: number, e: any) => sum + (e.progress || 0), 0) / (totalEnrolled || 1);
      const totalWatchTime = enrollments.reduce((sum: number, e: any) => sum + (e.totalWatchTime || 0), 0);

      return NextResponse.json({
        success: true,
        course: {
          title: course.content?.en?.title,
          slug: course.slug,
        },
        stats: {
          totalEnrolled,
          completed,
          active,
          completionRate: totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0,
          avgProgress: Math.round(avgProgress),
          totalWatchTime,
          enrollmentDetails: enrollments.map((e: any) => ({
            userId: e.userId?._id,
            userName: e.userId?.name,
            userEmail: e.userId?.email,
            progress: e.progress,
            status: e.status,
            watchTime: e.totalWatchTime,
            enrolledAt: e.enrolledAt,
          })),
        },
      });
    }

    // User specific stats
    if (userId) {
      const enrollments = await CourseEnrollment.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate('courseId', 'slug content.en.title');

      const stats = enrollments.map((e: any) => ({
        courseId: e.courseId?._id,
        courseName: e.courseId?.content?.en?.title,
        courseSlug: e.courseId?.slug,
        progress: e.progress,
        status: e.status,
        watchTime: e.totalWatchTime,
        enrolledAt: e.enrolledAt,
        certificateIssued: e.certificateIssued,
      }));

      const totalWatchTime = enrollments.reduce((sum: number, e: any) => sum + (e.totalWatchTime || 0), 0);
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((sum: number, e: any) => sum + e.progress, 0) / enrollments.length)
        : 0;

      return NextResponse.json({
        success: true,
        stats: {
          totalCourses: enrollments.length,
          totalWatchTime,
          avgProgress,
          completedCourses: enrollments.filter((e: any) => e.status === 'completed').length,
          enrollments: stats,
        },
      });
    }

    return NextResponse.json({ success: true, stats: {} });

  } catch (error: any) {
    console.error('[Analytics GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
