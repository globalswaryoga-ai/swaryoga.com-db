/**
 * User Assignments API
 * GET /api/user/assignments - Get all assignments for user
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  listEnrollmentsByUser,
  getCourseById,
  listAssignments,
} from '@/lib/bunnyCourseRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const enrollments = await listEnrollmentsByUser(String(userId));
    const activeEnrollments = enrollments.filter((e) => ['active', 'completed'].includes(e.status));

    // Fetch user submissions from BunnyDB
    const submissionsRes = await bunnyExecute({
      sql: 'SELECT * FROM course_assignment_submissions_sql WHERE user_id = ?',
      args: [String(userId)],
    }).catch(() => ({ rows: [] }));

    const submissionMap = new Map<string, any>();
    for (const row of submissionsRes.rows) {
      let data: any = {};
      try {
        data = JSON.parse(String(row.data_json || '{}'));
      } catch {}
      submissionMap.set(String(row.assignment_id), {
        status: row.status,
        submittedAt: row.submitted_at,
        score: data.score,
        feedback: data.feedback,
      });
    }

    const assignments: any[] = [];

    for (const enrollment of activeEnrollments) {
      const course = await getCourseById(enrollment.courseId);
      if (!course) continue;

      const courseTitle = (course.content as any)?.en?.title || course.slug || 'Course';
      const courseAssignments = await listAssignments(course.id);

      for (const assignment of courseAssignments) {
        const sub = submissionMap.get(assignment.id);
        assignments.push({
          id: assignment.id,
          courseId: course.id,
          courseTitle,
          title: assignment.title,
          description: (assignment.content as any)?.description || '',
          dueDate: (assignment.content as any)?.dueDate || null,
          type: 'assignment',
          totalPoints: (assignment.content as any)?.totalPoints || 100,
          submissionStatus: sub ? sub.status : 'pending',
          submittedDate: sub?.submittedAt,
          score: sub?.score,
          feedback: sub?.feedback,
          questions: [],
        });
      }
    }

    // Sort by due date
    assignments.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

    return NextResponse.json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    console.error('[User Assignments Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
