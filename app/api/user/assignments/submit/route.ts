/**
 * Student Assignment & Task Submission API (BunnyDB)
 * POST /api/user/assignments/submit - Save student quiz answers, task completion, or question replies
 * GET  /api/user/assignments/submit - Retrieve existing submission for student + assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

async function getStudentIdentity(userId: string) {
  try {
    const u1 = await bunnyExecute({
      sql: 'SELECT * FROM users WHERE id = ? OR userId = ? LIMIT 1',
      args: [userId, userId],
    });
    if (u1.rows[0]) {
      const row: any = u1.rows[0];
      return {
        name: String(row.name || 'Student'),
        email: String(row.email || ''),
        phone: row.phone ? String(row.phone) : '',
      };
    }

    const u2 = await bunnyExecute({
      sql: 'SELECT * FROM admin_users_sql WHERE id = ? OR user_id = ? LIMIT 1',
      args: [userId, userId],
    });
    if (u2.rows[0]) {
      const row: any = u2.rows[0];
      return {
        name: String(row.name || 'Admin / Student'),
        email: String(row.email || ''),
        phone: row.phone ? String(row.phone) : '',
      };
    }

    const u3 = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'users' AND document_id = ? LIMIT 1",
      args: [userId],
    });
    if (u3.rows[0]) {
      try {
        const doc = JSON.parse(String(u3.rows[0].document_json));
        return {
          name: String(doc.name || 'Student'),
          email: String(doc.email || ''),
          phone: doc.phone ? String(doc.phone) : '',
        };
      } catch {}
    }
  } catch {}

  return { name: 'Student', email: '', phone: '' };
}

export async function POST(request: NextRequest) {
  try {
    await initCourseSchema();

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
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = String(decoded.id || decoded._id || decoded.userId || '');
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const body = await request.json();
    const {
      assignmentId,
      courseId,
      subType = 'assignment',
      title = '',
      answers = {},
      checklist = [],
      score = null,
      total = 100,
      passed = false,
      status: reqStatus,
    } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    const studentInfo = await getStudentIdentity(userId);

    // Determine status
    let status = reqStatus;
    if (!status) {
      if (subType === 'task') {
        const allChecked = Array.isArray(checklist) && checklist.length > 0 && checklist.every((c: any) => c.checked);
        status = allChecked ? 'completed' : 'in_progress';
      } else if (subType === 'question') {
        status = 'submitted';
      } else {
        status = passed ? 'passed' : 'submitted';
      }
    }

    const submissionId = `sub_${courseId || 'general'}_${assignmentId}_${userId}`;
    const payloadData = {
      subType,
      title,
      answers,
      checklist,
      score,
      total,
      passed: Boolean(passed),
      studentName: studentInfo.name,
      studentEmail: studentInfo.email,
      studentPhone: studentInfo.phone,
      submittedAt: new Date().toISOString(),
    };

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO course_assignment_submissions_sql (
        id, assignment_id, user_id, course_id, status, submitted_at, data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        submissionId,
        String(assignmentId),
        String(userId),
        String(courseId || ''),
        status,
        JSON.stringify(payloadData),
      ],
    });

    return NextResponse.json({
      success: true,
      submissionId,
      status,
      score,
      passed,
      message: 'Submission saved successfully',
    });
  } catch (error: any) {
    console.error('[Student Submission POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await initCourseSchema();

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
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = String(decoded.id || decoded._id || decoded.userId || '');
    const assignmentId = request.nextUrl.searchParams.get('assignmentId');
    const courseId = request.nextUrl.searchParams.get('courseId');

    const conditions: string[] = ['user_id = ?'];
    const args: any[] = [userId];

    if (assignmentId) {
      conditions.push('assignment_id = ?');
      args.push(assignmentId);
    }
    if (courseId) {
      conditions.push('course_id = ?');
      args.push(courseId);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const res = await bunnyExecute({
      sql: `SELECT * FROM course_assignment_submissions_sql ${where} ORDER BY submitted_at DESC`,
      args,
    });

    const submissions = res.rows.map((row: any) => {
      let data: any = {};
      try {
        data = JSON.parse(String(row.data_json || '{}'));
      } catch {}

      return {
        id: String(row.id),
        assignmentId: row.assignment_id,
        courseId: row.course_id,
        status: row.status,
        submittedAt: row.submitted_at,
        ...data,
      };
    });

    return NextResponse.json({
      success: true,
      submissions,
    });
  } catch (error: any) {
    console.error('[Student Submission GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
