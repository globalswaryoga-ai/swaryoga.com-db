/**
 * Admin API for E-Learning Enrollments (BunnyDB)
 * GET /api/admin/e-learning/enrollments - List all enrollments
 * GET /api/admin/e-learning/enrollments?enrollmentId=... - Get enrollment details
 * PUT /api/admin/e-learning/enrollments - Update enrollment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  initCourseSchema,
  saveEnrollment,
  getCourseById,
  listDevices,
} from '@/lib/bunnyCourseRepository';

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

    const enrollmentId = request.nextUrl.searchParams.get('enrollmentId');

    // Get specific enrollment details
    if (enrollmentId) {
      const res = await bunnyExecute({
        sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
        args: [enrollmentId],
      });

      if (!res.rows[0]) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }

      const row: any = res.rows[0];
      const course = await getCourseById(String(row.course_id));
      const devices = await listDevices(String(row.user_id), String(row.course_id));

      const enrollment = {
        _id: String(row.id),
        id: String(row.id),
        userId: String(row.user_id),
        courseId: course ? { _id: course.id, slug: course.slug, content: course.content, level: course.level } : row.course_id,
        status: row.status,
        enrolledAt: row.enrolled_at,
        expiresAt: row.expires_at,
        progressPercent: Number(row.progress_percent || 0),
      };

      return NextResponse.json({
        success: true,
        enrollment,
        watchLogs: [],
        devices,
      });
    }

    // List all enrollments
    const userId = request.nextUrl.searchParams.get('userId');
    const courseId = request.nextUrl.searchParams.get('courseId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const conditions: string[] = [];
    const args: any[] = [];

    if (userId) {
      conditions.push('user_id = ?');
      args.push(userId);
    }
    if (courseId) {
      conditions.push('course_id = ?');
      args.push(courseId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await bunnyExecute({
      sql: `SELECT COUNT(*) as cnt FROM course_enrollments_sql ${where}`,
      args,
    });
    const total = Number(countRes.rows[0]?.cnt || 0);

    const offset = (page - 1) * limit;
    const listRes = await bunnyExecute({
      sql: `SELECT * FROM course_enrollments_sql ${where} ORDER BY enrolled_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    const enrollments = await Promise.all(
      listRes.rows.map(async (row: any) => {
        const c = await getCourseById(String(row.course_id));
        return {
          _id: String(row.id),
          id: String(row.id),
          userId: { _id: String(row.user_id), name: String(row.user_id), email: '' },
          courseId: c ? { _id: c.id, slug: c.slug, content: c.content, level: c.level } : String(row.course_id),
          status: row.status,
          enrolledAt: row.enrolled_at,
          expiresAt: row.expires_at,
          progressPercent: Number(row.progress_percent || 0),
        };
      })
    );

    return NextResponse.json({
      success: true,
      enrollments,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error('[Enrollments GET Error]:', error);
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
    const { enrollmentId, status, expiresAt, progressPercent } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }

    const res = await bunnyExecute({
      sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
      args: [enrollmentId],
    });

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const row: any = res.rows[0];
    const updated = await saveEnrollment({
      id: enrollmentId,
      userId: row.user_id,
      courseId: row.course_id,
      status: status || row.status,
      expiresAt: expiresAt !== undefined ? expiresAt : row.expires_at,
      progressPercent: progressPercent !== undefined ? Number(progressPercent) : Number(row.progress_percent),
    });

    return NextResponse.json({
      success: true,
      enrollment: updated,
    });
  } catch (error: any) {
    console.error('[Enrollments PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
