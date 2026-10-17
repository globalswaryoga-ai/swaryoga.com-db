/**
 * Admin API for Recorded Courses Management (BunnyDB)
 * GET /api/admin/recorded-courses - List all courses (admin)
 * POST /api/admin/recorded-courses - Create new course
 * PUT /api/admin/recorded-courses - Update course
 * DELETE /api/admin/recorded-courses - Delete course
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listCourses,
  getCourseById,
  getCourseBySlug,
  saveCourse,
  updateCourse,
  deleteCourse,
  listSectionsByCourse,
  listVideosByCourse,
  listMaterialsByCourse,
  listAssignmentsByCourse,
  countEnrollmentsByCourse,
  countVideosByCourse,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List all courses for admin or get single course
 */
export async function GET(request: NextRequest) {
  try {
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

    const courseId = request.nextUrl.searchParams.get('id');
    const folderId = request.nextUrl.searchParams.get('folderId');

    // Get specific course with full details
    if (courseId) {
      const course = await getCourseById(courseId);
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const [sections, videos, materials, assignments, enrollmentCount] = await Promise.all([
        listSectionsByCourse(courseId),
        listVideosByCourse(courseId, false),
        listMaterialsByCourse(courseId, false),
        listAssignmentsByCourse(courseId, false),
        countEnrollmentsByCourse(courseId),
      ]);

      return NextResponse.json({
        success: true,
        course,
        sections,
        videos,
        materials,
        assignments,
        enrollmentCount,
      });
    }

    // List all active courses
    const courses = await listCourses({
      folderId: folderId || undefined,
      isActive: true,
    });

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await countEnrollmentsByCourse(course.id);
        const videoCount = await countVideosByCourse(course.id);
        return {
          ...course,
          enrollmentCount,
          videoCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      courses: coursesWithStats,
    });
  } catch (error: any) {
    console.error('[Admin Courses GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create new course
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();

    if (!body.slug && body.content?.en?.title) {
      body.slug = body.content.en.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    if (!body.slug) {
      body.slug = `course-${Date.now().toString(36)}`;
    }

    const existingCourse = await getCourseBySlug(body.slug);
    if (existingCourse) {
      body.slug = `${body.slug}-${Date.now().toString(36)}`;
    }

    if (body.isActive === undefined) body.isActive = true;
    if (body.isPublished === undefined) body.isPublished = true;

    const course = await saveCourse(body);

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error: any) {
    console.error('[Admin Courses POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update course
 */
export async function PUT(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { courseId, ...updateData } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const course = await updateCourse(courseId, updateData);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error: any) {
    console.error('[Admin Courses PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete course (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
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

    const courseId = request.nextUrl.searchParams.get('id');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    await deleteCourse(courseId);

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error: any) {
    console.error('[Admin Courses DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
