/**
 * Admin API for Certificates (BunnyDB)
 * GET /api/admin/e-learning/certificates - List certificates
 * POST /api/admin/e-learning/certificates - Issue certificate
 * DELETE /api/admin/e-learning/certificates - Revoke certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema, getCourseById } from '@/lib/bunnyCourseRepository';

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

    const courseId = request.nextUrl.searchParams.get('courseId');
    const userId = request.nextUrl.searchParams.get('userId');

    const conditions: string[] = [];
    const args: any[] = [];

    if (courseId) {
      conditions.push('course_id = ?');
      args.push(courseId);
    }
    if (userId) {
      conditions.push('user_id = ?');
      args.push(userId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await bunnyExecute({
      sql: `SELECT * FROM course_certificates_sql ${where} ORDER BY issued_at DESC`,
      args,
    });

    const certificates = await Promise.all(
      res.rows.map(async (row: any) => {
        const c = await getCourseById(String(row.course_id));
        return {
          enrollmentId: row.enrollment_id,
          userId: { _id: row.user_id, name: row.user_id, email: '' },
          courseId: c ? { _id: c.id, content: c.content } : row.course_id,
          certificateNumber: row.certificate_number,
          certificateUrl: (JSON.parse(row.data_json || '{}'))?.certificateUrl || '',
          certificateIssuedAt: row.issued_at,
        };
      })
    );

    return NextResponse.json({
      success: true,
      certificates,
    });
  } catch (error: any) {
    console.error('[Certificates GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { enrollmentId, userId, courseId, certificateUrl } = body;

    const certId = crypto.randomUUID();
    const certNum = `CERT-${Date.now()}`;
    const timestamp = new Date().toISOString();

    await bunnyExecute({
      sql: `INSERT INTO course_certificates_sql (
        id, enrollment_id, user_id, course_id, certificate_number, issued_at, data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        certId,
        enrollmentId || '',
        userId || '',
        courseId || '',
        certNum,
        timestamp,
        JSON.stringify({ certificateUrl: certificateUrl || '' }),
        timestamp,
        timestamp,
      ],
    });

    return NextResponse.json({
      success: true,
      certificate: {
        id: certId,
        certificateNumber: certNum,
        certificateUrl,
      },
    });
  } catch (error: any) {
    console.error('[Certificates POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
