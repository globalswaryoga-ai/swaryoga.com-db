/**

 * Course Certificate API (Bunny Database / LibSQL)
 * GET /api/recorded-courses/certificate/[enrollmentId] - Download certificate PDF
 * POST /api/recorded-courses/certificate/[enrollmentId] - Generate/issue certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
import { generateCourseCertificate } from '@/lib/course-certificate-generator';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema, getCourseById } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ enrollmentId: string }>;
}


export const dynamic = 'force-dynamic';

/**
 * GET - Download certificate PDF
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { enrollmentId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }


    const userId = decoded.id || decoded._id || decoded.userId;

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get enrollment from Bunny DB
    const enrollRes = await bunnyExecute({
      sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
      args: [enrollmentId],
    });

    if (!enrollRes.rows.length) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const enrollment = enrollRes.rows[0];

    // Check ownership
    if (String(enrollment.user_id) !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    // Get course
    const courseRes = await bunnyExecute({
      sql: 'SELECT * FROM recorded_courses_sql WHERE id = ? LIMIT 1',
      args: [enrollment.course_id],
    });

    const course = courseRes.rows[0] || {};
    let courseContent: any = {};
    try {
      courseContent = course.content_json ? JSON.parse(String(course.content_json)) : {};
    } catch {}

    let enrollmentData: any = {};
    try {
      enrollmentData = enrollment.data_json ? JSON.parse(String(enrollment.data_json)) : {};
    } catch {}

    const studentName = decoded.name || enrollmentData.studentName || 'Student';
    const courseTitle = courseContent?.en?.title || course.slug || 'Course';
    const certNum = enrollmentData.certificateNumber || `CERT-${enrollmentId.substring(0, 12).toUpperCase()}`;

    const certificate = generateCourseCertificate({
      studentName,
      studentEmail: decoded.email || enrollmentData.studentEmail || '',
      courseTitle,
      courseInstructor: 'Swar Yoga Team',
      completionDate: enrollment.updated_at || new Date(),
      certificateNumber: certNum,
      duration: Number(course.total_duration) || 0,
      progress: Number(enrollment.progress_percent) || 100,
    });

    return new NextResponse(certificate as any, {
      headers: {
        'Content-Type': 'application/pdf',

        'Content-Disposition': `attachment; filename="${studentName.replace(/\s+/g, '_')}_${courseTitle.replace(/\s+/g, '_')}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Certificate Download Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


/**
 * POST - Generate/issue certificate
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { enrollmentId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }


    const userId = decoded.id || decoded._id || decoded.userId;

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const enrollRes = await bunnyExecute({
      sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
      args: [enrollmentId],
    });

    if (!enrollRes.rows.length) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const enrollment = enrollRes.rows[0];

    if (String(enrollment.user_id) !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    const certId = `cert_${crypto.randomBytes(8).toString('hex')}`;
    const certNum = `CERT-${enrollmentId.substring(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
    const now = new Date().toISOString();

    let enrollmentData: any = {};
    try {
      enrollmentData = enrollment.data_json ? JSON.parse(String(enrollment.data_json)) : {};
    } catch {}

    enrollmentData.certificateIssued = true;
    enrollmentData.certificateNumber = certNum;
    enrollmentData.certificateIssuedAt = now;

    await bunnyExecute({
      sql: `UPDATE course_enrollments_sql 
            SET status = 'completed', progress_percent = 100, data_json = ?, updated_at = ?
            WHERE id = ?`,
      args: [JSON.stringify(enrollmentData), now, enrollmentId],
    });

    await bunnyExecute({
      sql: `INSERT INTO course_certificates_sql 
            (id, enrollment_id, user_id, course_id, certificate_number, issued_at, data_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [certId, enrollmentId, userId, enrollment.course_id, certNum, now, JSON.stringify(enrollmentData), now, now],
    });

    return NextResponse.json({
      success: true,
      message: 'Certificate issued',

      certificateNumber: certNum,
      certificateId: certId,
    });
  } catch (error: any) {
    console.error('[Certificate Generate Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
