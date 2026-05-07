/**
 * Admin API for Course Assignments
 * GET /api/admin/e-learning/assignments - List assignments for course
 * POST /api/admin/e-learning/assignments - Create assignment
 * PUT /api/admin/e-learning/assignments - Update assignment
 * DELETE /api/admin/e-learning/assignments - Delete assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCourseAssignment, getRecordedCourse } from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List assignments for a course
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

    const CourseAssignment = getCourseAssignment();
    const assignments = await CourseAssignment.find({ courseId, isActive: true })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      assignments,
    });

  } catch (error: any) {
    console.error('[Assignments GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create new assignment
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
    const { courseId, ...assignmentData } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const RecordedCourse = getRecordedCourse();
    const CourseAssignment = getCourseAssignment();

    // Verify course exists
    const course = await RecordedCourse.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get next order
    const lastAssignment = await CourseAssignment.findOne({ courseId }).sort({ order: -1 });
    const nextOrder = (lastAssignment?.order || 0) + 1;

    const assignment = await CourseAssignment.create({
      ...assignmentData,
      courseId,
      order: assignmentData.order || nextOrder,
      isActive: true,
      createdBy: decoded.id,
    });

    return NextResponse.json({
      success: true,
      assignment,
    });

  } catch (error: any) {
    console.error('[Assignments POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update assignment
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
    const { assignmentId, ...updateData } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const CourseAssignment = getCourseAssignment();

    const assignment = await CourseAssignment.findByIdAndUpdate(
      assignmentId,
      { ...updateData, updatedBy: decoded.id },
      { new: true }
    );

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignment,
    });

  } catch (error: any) {
    console.error('[Assignments PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete assignment (soft delete)
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

    const assignmentId = request.nextUrl.searchParams.get('id');
    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const CourseAssignment = getCourseAssignment();

    const assignment = await CourseAssignment.findByIdAndUpdate(
      assignmentId,
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.id },
      { new: true }
    );

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted',
    });

  } catch (error: any) {
    console.error('[Assignments DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
