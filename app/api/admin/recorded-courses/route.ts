/**
 * Admin API for Recorded Courses Management
 * GET /api/admin/recorded-courses - List all courses (admin)
 * POST /api/admin/recorded-courses - Create new course
 * PUT /api/admin/recorded-courses - Update course
 * DELETE /api/admin/recorded-courses - Delete course
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  getRecordedCourse,
  getCourseVideo,
  getCourseSection,
  getCourseMaterial,
  getCourseAssignment,
  getCourseEnrollment,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

// Check admin access
function checkAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return decoded.isAdmin === true || decoded.role === 'admin' || decoded.role === 'superadmin';
}

/**
 * GET - List all courses for admin
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Auth required
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
    
    if (!checkAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const courseId = request.nextUrl.searchParams.get('id');
    const RecordedCourse = getRecordedCourse();
    const CourseVideo = getCourseVideo();
    const CourseSection = getCourseSection();
    const CourseMaterial = getCourseMaterial();
    const CourseAssignment = getCourseAssignment();
    const CourseEnrollment = getCourseEnrollment();
    
    // Get specific course with full details
    if (courseId) {
      const course = await RecordedCourse.findById(courseId).lean();
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      
      const sections = await CourseSection.find({ courseId }).sort({ order: 1 }).lean();
      const videos = await CourseVideo.find({ courseId }).sort({ order: 1 }).lean();
      const materials = await CourseMaterial.find({ courseId }).sort({ order: 1 }).lean();
      const assignments = await CourseAssignment.find({ courseId }).sort({ order: 1 }).lean();
      const enrollmentCount = await CourseEnrollment.countDocuments({ courseId });
      
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
    
    // List all courses
    const courses = await RecordedCourse.find({}).sort({ order: 1, createdAt: -1 }).lean();
    
    // Get enrollment counts
    const coursesWithStats = await Promise.all(
      courses.map(async (course: any) => {
        const enrollmentCount = await CourseEnrollment.countDocuments({ courseId: course._id });
        const videoCount = await CourseVideo.countDocuments({ courseId: course._id });
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
    await connectDB();
    
    // Auth required
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
    
    if (!checkAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const RecordedCourse = getRecordedCourse();
    
    // Generate slug if not provided
    if (!body.slug && body.content?.en?.title) {
      body.slug = body.content.en.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Check slug uniqueness
    const existingCourse = await RecordedCourse.findOne({ slug: body.slug });
    if (existingCourse) {
      body.slug = `${body.slug}-${Date.now().toString(36)}`;
    }
    
    const course = await RecordedCourse.create({
      ...body,
      createdBy: decoded.id,
    });
    
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
    await connectDB();
    
    // Auth required
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
    
    if (!checkAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { courseId, ...updateData } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const RecordedCourse = getRecordedCourse();
    
    const course = await RecordedCourse.findByIdAndUpdate(
      courseId,
      { ...updateData, updatedBy: decoded.id },
      { new: true }
    );
    
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
    await connectDB();
    
    // Auth required
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
    
    if (!checkAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const courseId = request.nextUrl.searchParams.get('id');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const RecordedCourse = getRecordedCourse();
    
    // Soft delete
    const course = await RecordedCourse.findByIdAndUpdate(
      courseId,
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.id },
      { new: true }
    );
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Course deleted',
    });
    
  } catch (error: any) {
    console.error('[Admin Courses DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
