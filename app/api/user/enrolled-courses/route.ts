/**
 * User Enrolled Courses API
 * GET /api/user/enrolled-courses - Get user's enrolled courses with progress
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  listEnrollmentsByUser,
  getCourseById,
  listVideos,
  listAssignments,
  listMaterials,
  listWatchLogs,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user's enrolled courses from BunnyDB
    const allEnrollments = await listEnrollmentsByUser(String(userId));
    const enrollments = allEnrollments.filter((e) => ['active', 'completed'].includes(e.status));

    if (enrollments.length === 0) {
      return NextResponse.json({
        success: true,
        courses: [],
        message: 'No enrolled courses',
      });
    }

    // Enrich with course details and progress
    const enrolledCoursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await getCourseById(enrollment.courseId);
        if (!course) return null;

        const [videos, watchLogs, assignments, materials] = await Promise.all([
          listVideos(course.id),
          listWatchLogs(String(userId), course.id),
          listAssignments(course.id),
          listMaterials(course.id),
        ]);

        const activeVideos = videos.filter((v) => v.isActive);

        const watchedVideoIds = new Set(
          watchLogs
            .filter((log) => log.isCompleted)
            .map((log) => String(log.videoId))
        );

        const completionPercentage = activeVideos.length > 0
          ? Math.round((watchedVideoIds.size / activeVideos.length) * 100)
          : 0;

        // Calculate remaining days/hours
        const enrolledDate = new Date(enrollment.enrolledAt);
        const giftHours = (course as any).giftHours?.hours || 0;
        const expiryDate = new Date(enrolledDate.getTime() + giftHours * 60 * 60 * 1000);
        const now = new Date();
        const remainingMs = Math.max(0, expiryDate.getTime() - now.getTime());
        const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        return {
          enrollment: {
            _id: enrollment.id,
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            completedAt: (enrollment as any).completedAt || null,
          },
          course: {
            _id: course.id,
            slug: course.slug,
            title: (course.content as any)?.en?.title || course.slug || '',
            subtitle: (course.content as any)?.en?.subtitle,
            description: (course.content as any)?.en?.description,
            thumbnail: course.thumbnail,
            level: course.level,
            videoLanguage: course.videoLanguage,
            totalVideos: activeVideos.length,
            totalDuration: course.totalDuration,
            pricing: course.pricing,
          },
          progress: {
            watchedCount: watchedVideoIds.size,
            totalCount: activeVideos.length,
            completionPercentage,
            remainingDays,
            remainingHours,
          },
          videos: activeVideos.map((v) => ({
            _id: v.id,
            title: (v.content as any)?.en?.title || v.id,
            duration: v.duration,
            order: v.order,
            bunnyVideoId: v.bunnyVideoId,
            isWatched: watchedVideoIds.has(String(v.id)),
            isCompleted: watchLogs.some(
              (log) => String(log.videoId) === String(v.id) && log.isCompleted
            ),
          })),
          assignments: assignments.map((a) => ({
            _id: a.id,
            title: (a.content as any)?.en?.title || a.id,
            description: (a.content as any)?.en?.description,
            dueDate: (a.content as any)?.dueDate || null,
            isSubmitted: false,
            submittedAt: null,
          })),
          materials: materials.map((m) => ({
            _id: m.id,
            title: (m.content as any)?.en?.title || m.title || m.id,
            type: m.fileType,
            fileUrl: m.fileUrl,
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
