/**
 * Admin API for Assignment Submissions, Tasks & Question Replies (BunnyDB)
 * GET    /api/admin/e-learning/assignment-submissions - Get all submissions (with filters: userId, courseId, subType, status, search)
 * PUT    /api/admin/e-learning/assignment-submissions - Grade submission, change status, add feedback
 * DELETE /api/admin/e-learning/assignment-submissions - Delete or reset a submission
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

async function findStudentDetails(userId: string) {
  try {
    const u1 = await bunnyExecute({
      sql: 'SELECT * FROM users WHERE id = ? OR userId = ? LIMIT 1',
      args: [userId, userId],
    });
    if (u1.rows[0]) {
      const row: any = u1.rows[0];
      return {
        _id: String(row.id || row.userId || userId),
        name: String(row.name || 'Student'),
        email: String(row.email || ''),
        phone: row.phone ? String(row.phone) : '',
        country: row.country ? String(row.country) : '',
        state: row.state ? String(row.state) : '',
        profession: row.profession ? String(row.profession) : '',
      };
    }

    const u2 = await bunnyExecute({
      sql: 'SELECT * FROM admin_users_sql WHERE id = ? OR user_id = ? LIMIT 1',
      args: [userId, userId],
    });
    if (u2.rows[0]) {
      const row: any = u2.rows[0];
      return {
        _id: String(row.id || row.user_id || userId),
        name: String(row.name || 'Admin / Student'),
        email: String(row.email || ''),
        phone: row.phone ? String(row.phone) : '',
        country: '',
        state: '',
        profession: '',
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
          _id: String(doc._id?.$oid || doc._id || userId),
          name: String(doc.name || 'Student'),
          email: String(doc.email || ''),
          phone: doc.phone ? String(doc.phone) : '',
          country: doc.country ? String(doc.country) : '',
          state: doc.state ? String(doc.state) : '',
          profession: doc.profession ? String(doc.profession) : '',
        };
      } catch {}
    }
  } catch {}

  return {
    _id: userId,
    name: 'Student ' + (userId.slice(-4) || ''),
    email: '',
    phone: '',
    country: '',
    state: '',
    profession: '',
  };
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

    const url = request.nextUrl;
    const assignmentId = url.searchParams.get('assignmentId');
    const userId = url.searchParams.get('userId');
    const courseId = url.searchParams.get('courseId');
    const subType = url.searchParams.get('subType');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.toLowerCase().trim();

    const conditions: string[] = [];
    const args: any[] = [];

    if (assignmentId) {
      conditions.push('assignment_id = ?');
      args.push(assignmentId);
    }
    if (userId) {
      conditions.push('user_id = ?');
      args.push(userId);
    }
    if (courseId) {
      conditions.push('course_id = ?');
      args.push(courseId);
    }
    if (status && status !== 'all') {
      conditions.push('status = ?');
      args.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await bunnyExecute({
      sql: `SELECT * FROM course_assignment_submissions_sql ${where} ORDER BY submitted_at DESC`,
      args,
    });

    // Cache course titles to avoid repeated queries
    const courseTitleMap = new Map<string, string>();
    const courseRows = await bunnyExecute('SELECT id, slug, content_json FROM courses_sql').catch(() => ({ rows: [] }));
    for (const rawC of courseRows.rows) {
      const c = rawC as any;
      let title = c.slug;
      try {
        const parsed = JSON.parse(String(c.content_json || '{}'));
        title = parsed.en?.title || parsed.title || c.slug;
      } catch {}
      courseTitleMap.set(String(c.id), title);
    }

    // Cache assignment details
    const assignMap = new Map<string, any>();
    const assignRows = await bunnyExecute('SELECT id, title, content_json FROM course_assignments_sql').catch(() => ({ rows: [] }));
    for (const rawA of assignRows.rows) {
      const a = rawA as any;
      let content: any = {};
      try {
        content = JSON.parse(String(a.content_json || '{}'));
      } catch {}
      assignMap.set(String(a.id), {
        title: a.title,
        content,
      });
    }

    // Cache users for fast resolution
    const userCache = new Map<string, any>();

    const rawSubmissions = res.rows;
    let submissions: any[] = [];

    for (const row of rawSubmissions) {
      const uId = String(row.user_id);
      if (!userCache.has(uId)) {
        userCache.set(uId, await findStudentDetails(uId));
      }
      const student = userCache.get(uId);

      let data: any = {};
      try {
        data = JSON.parse(String(row.data_json || '{}'));
      } catch {}

      const itemAssignment = assignMap.get(String(row.assignment_id));
      const cTitle = courseTitleMap.get(String(row.course_id)) || 'Course Workshop';

      // Infer subType if not explicit in data
      let itemSubType = data.subType;
      if (!itemSubType) {
        if (data.checklist && Array.isArray(data.checklist) && data.checklist.length > 0) {
          itemSubType = 'task';
        } else if (itemAssignment?.content?.subType) {
          itemSubType = itemAssignment.content.subType;
        } else {
          itemSubType = 'assignment';
        }
      }

      const submissionTitle = data.title || itemAssignment?.title || 'Assignment Task';

      const enriched = {
        _id: String(row.id),
        id: String(row.id),
        assignmentId: row.assignment_id,
        userId: student,
        courseId: row.course_id,
        courseTitle: cTitle,
        title: submissionTitle,
        subType: itemSubType,
        status: row.status,
        submittedAt: row.submitted_at,
        score: data.score !== undefined ? data.score : null,
        total: data.total || itemAssignment?.content?.totalPoints || 100,
        passingPoints: itemAssignment?.content?.passingPoints || 60,
        passed: Boolean(data.passed),
        answers: data.answers || {},
        checklist: data.checklist || [],
        feedback: data.feedback || '',
        grade: data.grade || null,
        assignmentDetails: itemAssignment || null,
      };

      // Apply subType filter if requested
      if (subType && subType !== 'all') {
        if (subType === 'quiz' || subType === 'assignment') {
          if (enriched.subType !== 'assignment' && enriched.subType !== 'quiz') continue;
        } else if (enriched.subType !== subType) {
          continue;
        }
      }

      // Apply search query across student name, email, phone, and title
      if (search) {
        const studentText = `${student.name} ${student.email} ${student.phone}`.toLowerCase();
        const titleText = `${submissionTitle} ${cTitle}`.toLowerCase();
        if (!studentText.includes(search) && !titleText.includes(search)) {
          continue;
        }
      }

      submissions.push(enriched);
    }

    // Calculate summary statistics
    const stats = {
      totalSubmissions: submissions.length,
      totalQuizzes: submissions.filter((s) => s.subType === 'assignment' || s.subType === 'quiz').length,
      totalTasks: submissions.filter((s) => s.subType === 'task').length,
      totalQuestions: submissions.filter((s) => s.subType === 'question').length,
      passedCount: submissions.filter((s) => s.passed || s.status === 'passed' || s.status === 'completed').length,
      uniqueStudents: new Set(submissions.map((s) => s.userId._id)).size,
    };

    return NextResponse.json({
      success: true,
      stats,
      submissions,
    });
  } catch (error: any) {
    console.error('[Submissions GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
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
    const { submissionId, status, score, grade, feedback } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }

    // Retrieve existing data
    const existing = await bunnyExecute({
      sql: 'SELECT data_json, status FROM course_assignment_submissions_sql WHERE id = ? LIMIT 1',
      args: [submissionId],
    });

    if (!existing.rows[0]) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    let currentData: any = {};
    try {
      currentData = JSON.parse(String(existing.rows[0].data_json || '{}'));
    } catch {}

    if (grade !== undefined) currentData.grade = grade;
    if (score !== undefined) currentData.score = Number(score);
    if (feedback !== undefined) currentData.feedback = String(feedback);

    const newStatus = status || existing.rows[0].status || 'graded';

    await bunnyExecute({
      sql: 'UPDATE course_assignment_submissions_sql SET status = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newStatus, JSON.stringify(currentData), submissionId],
    });

    return NextResponse.json({
      success: true,
      message: 'Submission updated and graded successfully',
      submission: {
        id: submissionId,
        status: newStatus,
        data: currentData,
      },
    });
  } catch (error: any) {
    console.error('[Submissions PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const submissionId = request.nextUrl.searchParams.get('id');
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'DELETE FROM course_assignment_submissions_sql WHERE id = ?',
      args: [submissionId],
    });

    return NextResponse.json({
      success: true,
      message: 'Submission reset/deleted successfully',
    });
  } catch (error: any) {
    console.error('[Submissions DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
