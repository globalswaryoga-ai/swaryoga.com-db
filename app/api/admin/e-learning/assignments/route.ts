/**

 * Admin API for Course Assignments (Bunny Database / LibSQL)
 * GET /api/admin/e-learning/assignments - List assignments for course
 * POST /api/admin/e-learning/assignments - Create assignment
 * PUT /api/admin/e-learning/assignments - Update assignment
 * PATCH /api/admin/e-learning/assignments - Update assignment order
 * DELETE /api/admin/e-learning/assignments - Delete assignment
 */

import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

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


    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const res = await bunnyExecute({
      sql: `SELECT * FROM course_assignments_sql 
            WHERE course_id = ? AND is_active = 1 
            ORDER BY display_order ASC, created_at DESC`,
      args: [courseId],
    });

    const assignments = res.rows.map((r: any) => {
      let content = {};
      try {
        content = r.content_json ? JSON.parse(String(r.content_json)) : {};
      } catch {}
      return {
        _id: r.id,
        id: r.id,
        courseId: r.course_id,
        title: r.title,
        order: Number(r.display_order) || 0,
        isActive: Boolean(r.is_active),
        content,
      };
    });

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

    const { courseId, title, order, content } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: 'Course ID and title required' }, { status: 400 });
    }

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const assignmentId = `asg_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    let displayOrder = Number(order);
    if (!Number.isFinite(displayOrder)) {
      const lastRes = await bunnyExecute({
        sql: 'SELECT MAX(display_order) as max_order FROM course_assignments_sql WHERE course_id = ?',
        args: [courseId],
      });
      displayOrder = (Number(lastRes.rows[0]?.max_order) || 0) + 1;
    }

    await bunnyExecute({
      sql: `INSERT INTO course_assignments_sql 
            (id, course_id, title, display_order, is_active, content_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [
        assignmentId,
        courseId,
        title,
        displayOrder,
        content ? JSON.stringify(content) : '{}',
        now,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      assignment: {
        _id: assignmentId,
        id: assignmentId,
        courseId,
        title,
        order: displayOrder,
      },
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

    const { assignmentId, title, order, content } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }


    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `UPDATE course_assignments_sql 
            SET title = COALESCE(?, title),
                display_order = COALESCE(?, display_order),
                content_json = COALESCE(?, content_json),
                updated_at = ?
            WHERE id = ?`,
      args: [
        title || null,
        order !== undefined ? order : null,
        content ? JSON.stringify(content) : null,
        now,
        assignmentId,
      ],
    });

    return NextResponse.json({
      success: true,
      assignment: { id: assignmentId, _id: assignmentId },
    });
  } catch (error: any) {
    console.error('[Admin Assignments PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**

 * PATCH - Update order
 */
export async function PATCH(request: NextRequest) {
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
    const { assignmentId, order } = body;

    if (!assignmentId || order === undefined) {
      return NextResponse.json({ error: 'Assignment ID and order required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await bunnyExecute({
      sql: 'UPDATE course_assignments_sql SET display_order = ?, updated_at = ? WHERE id = ?',
      args: [order, now, assignmentId],
    });

    return NextResponse.json({
      success: true,
      assignmentId,
      order,
    });
  } catch (error: any) {
    console.error('[Assignments PATCH Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Soft delete assignment
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


    const now = new Date().toISOString();
    await bunnyExecute({
      sql: 'UPDATE course_assignments_sql SET is_active = 0, updated_at = ? WHERE id = ?',
      args: [now, assignmentId],
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted',
    });
  } catch (error: any) {
    console.error('[Admin Assignments DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
