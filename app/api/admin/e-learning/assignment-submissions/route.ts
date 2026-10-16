/**
 * Admin API for Assignment Submissions & Grading (BunnyDB)
 * GET /api/admin/e-learning/assignment-submissions - Get submissions for assignment/student
 * PUT /api/admin/e-learning/assignment-submissions - Grade submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

export async function GET(request: NextRequest) {
  try {
    await initCourseSchema();

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

    const assignmentId = request.nextUrl.searchParams.get('assignmentId');

    const conditions: string[] = [];
    const args: any[] = [];

    if (assignmentId) {
      conditions.push('assignment_id = ?');
      args.push(assignmentId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await bunnyExecute({
      sql: `SELECT * FROM course_assignment_submissions_sql ${where} ORDER BY submitted_at DESC`,
      args,
    });

    const submissions = res.rows.map((row: any) => ({
      _id: String(row.id),
      id: String(row.id),
      assignmentId: row.assignment_id,
      userId: { _id: row.user_id, name: row.user_id },
      courseId: row.course_id,
      status: row.status,
      submittedAt: row.submitted_at,
      data: JSON.parse(row.data_json || '{}'),
    }));

    return NextResponse.json({
      success: true,
      submissions,
    });
  } catch (error: any) {
    console.error('[Submissions GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initCourseSchema();

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
    const { submissionId, status, grade, feedback } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'UPDATE course_assignment_submissions_sql SET status = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [status || 'graded', JSON.stringify({ grade, feedback }), submissionId],
    });

    return NextResponse.json({
      success: true,
      message: 'Submission graded',
    });
  } catch (error: any) {
    console.error('[Submissions PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
