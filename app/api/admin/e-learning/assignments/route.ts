/**
<<<<<<< HEAD
 * Admin API for Course Assignments (BunnyDB)
=======
 * Admin API for Course Assignments (Bunny Database / LibSQL)
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
 * GET /api/admin/e-learning/assignments - List assignments for course
 * POST /api/admin/e-learning/assignments - Create assignment
 * PUT /api/admin/e-learning/assignments - Update assignment
 * PATCH /api/admin/e-learning/assignments - Update assignment order
 * DELETE /api/admin/e-learning/assignments - Delete assignment
 */

import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listAssignmentsByCourse,
  saveAssignment,
  deleteAssignment,
} from '@/lib/bunnyCourseRepository';
=======
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

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

<<<<<<< HEAD
    const assignments = await listAssignmentsByCourse(courseId, true);
=======
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
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

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
<<<<<<< HEAD
    const resolvedTitle = body.title || body.content?.en?.title || body.content?.title || '';
    const { courseId, order, ...rest } = body;

    if (!courseId || !resolvedTitle) {
      return NextResponse.json({ error: 'Course ID and title required' }, { status: 400 });
    }

    const assignment = await saveAssignment({
      courseId,
      title: resolvedTitle,
      order: Number(order || 1),
      isActive: true,
      content: { ...rest, en: { ...(rest.content?.en || {}), title: resolvedTitle } },
=======
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
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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
<<<<<<< HEAD
    const resolvedTitle = body.title || body.content?.en?.title || body.content?.title || '';
    const { assignmentId, courseId, order, ...rest } = body;
=======
    const { assignmentId, title, order, content } = body;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

<<<<<<< HEAD
    const assignment = await saveAssignment({
      id: assignmentId,
      courseId: courseId || '',
      title: resolvedTitle,
      order: order !== undefined ? Number(order) : 1,
      isActive: true,
      content: { ...rest, en: { ...(rest.content?.en || {}), title: resolvedTitle } },
    });
=======
    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

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
<<<<<<< HEAD
 * DELETE - Delete assignment
=======
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
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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

<<<<<<< HEAD
    await deleteAssignment(assignmentId);
=======
    const now = new Date().toISOString();
    await bunnyExecute({
      sql: 'UPDATE course_assignments_sql SET is_active = 0, updated_at = ? WHERE id = ?',
      args: [now, assignmentId],
    });
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted',
    });
  } catch (error: any) {
    console.error('[Admin Assignments DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
