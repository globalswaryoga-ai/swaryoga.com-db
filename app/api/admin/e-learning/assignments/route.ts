/**
 * Admin API for Course Assignments (BunnyDB)
 * GET /api/admin/e-learning/assignments - List assignments for course
 * POST /api/admin/e-learning/assignments - Create assignment
 * PUT /api/admin/e-learning/assignments - Update assignment
 * DELETE /api/admin/e-learning/assignments - Delete assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listAssignmentsByCourse,
  saveAssignment,
  deleteAssignment,
} from '@/lib/bunnyCourseRepository';

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

    const assignments = await listAssignmentsByCourse(courseId, true);

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    console.error('[Admin Assignments GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create assignment
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
    const { courseId, title, order, ...rest } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: 'Course ID and title required' }, { status: 400 });
    }

    const assignment = await saveAssignment({
      courseId,
      title,
      order: Number(order || 1),
      isActive: true,
      content: rest,
    });

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    console.error('[Admin Assignments POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update assignment
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
    const { assignmentId, courseId, title, order, ...rest } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const assignment = await saveAssignment({
      id: assignmentId,
      courseId: courseId || '',
      title: title || '',
      order: order !== undefined ? Number(order) : 1,
      isActive: true,
      content: rest,
    });

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    console.error('[Admin Assignments PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete assignment
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

    const assignmentId = request.nextUrl.searchParams.get('id');
    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    await deleteAssignment(assignmentId);

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted',
    });
  } catch (error: any) {
    console.error('[Admin Assignments DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
