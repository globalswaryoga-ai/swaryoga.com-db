/**
 * Admin API for Course Sections Management
 * GET /api/admin/recorded-courses/sections - List sections for a course
 * POST /api/admin/recorded-courses/sections - Create new section
 * PUT /api/admin/recorded-courses/sections - Update section
 * DELETE /api/admin/recorded-courses/sections - Delete section
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {

  getRecordedCourse,
  getCourseSection,
  getCourseVideo,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';


// Check superadmin access - E-Learning management is superadmin only
function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List sections for a course
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
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const CourseSection = getCourseSection();
    const sections = await CourseSection.find({ courseId }).sort({ order: 1 }).lean();
    
    return NextResponse.json({
      success: true,
      sections,
    });
    
  } catch (error: any) {
    console.error('[Admin Sections GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create new section
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { courseId, ...sectionData } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const RecordedCourse = getRecordedCourse();
    const CourseSection = getCourseSection();
    
    // Verify course exists
    const course = await RecordedCourse.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Get next order number
    const lastSection = await CourseSection.findOne({ courseId }).sort({ order: -1 });
    const nextOrder = (lastSection?.order || 0) + 1;
    
    const section = await CourseSection.create({
      ...sectionData,
      courseId,
      order: sectionData.order || nextOrder,
      createdBy: decoded.id,
    });
    
    return NextResponse.json({
      success: true,
      section,
    });
    
  } catch (error: any) {
    console.error('[Admin Sections POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update section
 */
export async function PUT(request: NextRequest) {
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
    
    const body = await request.json();
    const { sectionId, courseId, ...updateData } = body;
    
    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID required' }, { status: 400 });
    }
    
    const CourseSection = getCourseSection();
    
    const section = await CourseSection.findByIdAndUpdate(
      sectionId,
      { ...updateData, updatedBy: decoded.id },
      { new: true }
    );
    
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      section,
    });
    
  } catch (error: any) {
    console.error('[Admin Sections PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete section (soft delete)
 */
export async function DELETE(request: NextRequest) {
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
    
    const sectionId = request.nextUrl.searchParams.get('id');
    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID required' }, { status: 400 });
    }
    
    const CourseSection = getCourseSection();
    const CourseVideo = getCourseVideo();
    
    const section = await CourseSection.findByIdAndUpdate(
      sectionId,
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.id },
      { new: true }
    );
    
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    
    // Move videos from this section to uncategorized
    await CourseVideo.updateMany(
      { sectionId },
      { $unset: { sectionId: 1 } }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Section deleted',
    });
    
  } catch (error: any) {
    console.error('[Admin Sections DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
