/**
 * User Enrolled Courses API
 * GET /api/user/enrolled-courses - Get user's enrolled courses with progress
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  getRecordedCourse,
  getCourseVideo,
  getCourseEnrollment,
  getVideoWatchLog,
  getCourseAssignment,
  getCourseMaterial,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Auth required
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

    if (!decoded?.id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const RecordedCourse = getRecordedCourse();
    const CourseVideo = getCourseVideo();
    const CourseEnrollment = getCourseEnrollment();
    const VideoWatchLog = getVideoWatchLog();
    const CourseAssignment = getCourseAssignment();
    const CourseMaterial = getCourseMaterial();

    // Get user's enrolled courses
    const enrollments = await CourseEnrollment.find({
      userId: decoded.id,
      status: { $in: ['active', 'completed'] },
    }).sort({ enrolledAt: -1 }).lean();

    if (enrollments.length === 0) {
      return NextResponse.json({
        success: true,
        courses: [],
        message: 'No enrolled courses',
      });
    }

    // Enrich with course details and progress
    const enrolledCoursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const course = await RecordedCourse.findById(enrollment.courseId).lean();
        if (!course) return null;

        const videos = await CourseVideo.find({
          courseId: course._id,
          isActive: true,
        }).sort({ order: 1 }).lean();

        const watchLogs = await VideoWatchLog.find({
          userId: decoded.id,
          courseId: course._id,
        }).lean();

        const assignments = await CourseAssignment.find({
          courseId: course._id,
          isActive: true,
        }).lean();

        const materials = await CourseMaterial.find({
          courseId: course._id,
          isActive: true,
        }).lean();

        const watchedVideoIds = new Set(
          watchLogs
            .filter((log: any) => log.isCompleted)
            .map((log: any) => log.videoId.toString())
        );

        const completionPercentage = videos.length > 0
          ? Math.round((watchedVideoIds.size / videos.length) * 100)
          : 0;

        // Calculate remaining days/hours
        const enrolledDate = new Date(enrollment.enrolledAt);
        const expiryDate = new Date(enrolledDate.getTime() + (course.giftHours?.hours || 0) * 60 * 60 * 1000);
        const now = new Date();
        const remainingMs = Math.max(0, expiryDate.getTime() - now.getTime());
        const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        return {
          enrollment: {
            _id: enrollment._id,
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt,
          },
          course: {
            _id: course._id,
            slug: course.slug,
            title: course.content?.en?.title || course.title || '',
            subtitle: course.content?.en?.subtitle,
            description: course.content?.en?.description,
            thumbnail: course.thumbnail,
            level: course.level,
            videoLanguage: course.videoLanguage,
            totalVideos: videos.length,
            totalDuration: course.totalDuration,
            pricing: course.pricing,
          },
          progress: {
            watchedCount: watchedVideoIds.size,
            totalCount: videos.length,
            completionPercentage,
            remainingDays,
            remainingHours,
          },
          videos: videos.map((v: any) => ({
            _id: v._id,
            title: v.content?.en?.title || v.title || '',
            duration: v.duration,
            order: v.order,
            bunnyVideoId: v.bunnyVideoId,
            isWatched: watchedVideoIds.has(v._id.toString()),
            isCompleted: watchLogs.some(
              (log: any) => log.videoId.toString() === v._id.toString() && log.isCompleted
            ),
          })),
          assignments: assignments.map((a: any) => ({
            _id: a._id,
            title: a.content?.en?.title || a.title || '',
            description: a.content?.en?.description,
            dueDate: a.dueDate,
            isSubmitted: !!a.submittedAt,
            submittedAt: a.submittedAt,
          })),
          materials: materials.map((m: any) => ({
            _id: m._id,
            title: m.content?.en?.title || m.title || '',
            type: m.type,
            fileUrl: m.type === 'pdf' ? m.fileUrl : null,
          })),
          hasCertificate: enrollment.status === 'completed' && completionPercentage === 100,
        };
      })
    );

    const validCourses = enrolledCoursesWithProgress.filter(Boolean);

    return NextResponse.json({
      success: true,
      courses: validCourses,
      totalEnrolled: validCourses.length,
    });
  } catch (error: any) {
    console.error('[User Enrolled Courses API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
