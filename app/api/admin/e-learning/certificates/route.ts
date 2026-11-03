/**
<<<<<<< HEAD
 * Admin API for Certificates (BunnyDB)
=======
 * Admin API for Certificates (Bunny Database / LibSQL)
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
 * GET /api/admin/e-learning/certificates - List certificates
 * POST /api/admin/e-learning/certificates - Issue certificate
 * DELETE /api/admin/e-learning/certificates - Revoke certificate
 */

import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema, getCourseById } from '@/lib/bunnyCourseRepository';
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

export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
    await initCourseSchema();

=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const courseId = request.nextUrl.searchParams.get('courseId');
    const userId = request.nextUrl.searchParams.get('userId');

<<<<<<< HEAD
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
=======
    let sql = 'SELECT * FROM course_certificates_sql WHERE 1=1';
    const args: any[] = [];
    if (courseId) {
      sql += ' AND course_id = ?';
      args.push(courseId);
    }
    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }
    sql += ' ORDER BY created_at DESC';

    const res = await bunnyExecute({ sql, args });

    const certificates = res.rows.map((r: any) => {
      let data: any = {};
      try {
        data = r.data_json ? JSON.parse(String(r.data_json)) : {};
      } catch {}
      return {
        _id: r.id,
        id: r.id,
        enrollmentId: r.enrollment_id,
        userId: r.user_id,
        courseId: r.course_id,
        certificateNumber: r.certificate_number,
        certificateUrl: data.certificateUrl || '',
        certificateIssuedAt: r.issued_at || r.created_at,
        ...data,
      };
    });
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

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
<<<<<<< HEAD
    await initCourseSchema();

=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
<<<<<<< HEAD
    const { enrollmentId, userId, courseId, certificateUrl } = body;
=======
    const { enrollmentId, certificateUrl, courseId, userId } = body;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    const certId = crypto.randomUUID();
    const certNum = `CERT-${Date.now()}`;
    const timestamp = new Date().toISOString();

<<<<<<< HEAD
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
=======
    const certId = `cert_${crypto.randomBytes(8).toString('hex')}`;
    const certNum = `SWAR-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    const dataJson = JSON.stringify({
      certificateUrl,
      issuedBy: decoded.id || 'admin',
    });

    await bunnyExecute({
      sql: `INSERT INTO course_certificates_sql 
            (id, enrollment_id, user_id, course_id, certificate_number, issued_at, data_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [certId, enrollmentId, userId || '', courseId || '', certNum, now, dataJson, now, now],
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    });

    return NextResponse.json({
      success: true,
      certificate: {
        id: certId,
<<<<<<< HEAD
        certificateNumber: certNum,
        certificateUrl,
=======
        enrollmentId,
        certificateUrl,
        certificateNumber: certNum,
        issuedAt: now,
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
      },
    });
  } catch (error: any) {
    console.error('[Certificates POST Error]:', error);
<<<<<<< HEAD
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
=======
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Revoke certificate
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

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const certificateId = request.nextUrl.searchParams.get('id');
    if (!certificateId) {
      return NextResponse.json({ error: 'Certificate ID required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'DELETE FROM course_certificates_sql WHERE id = ? OR enrollment_id = ?',
      args: [certificateId, certificateId],
    });

    return NextResponse.json({
      success: true,
      message: 'Certificate revoked',
    });
  } catch (error: any) {
    console.error('[Certificates DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  }
}
