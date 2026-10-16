/**
 * Course Certificate API (BunnyDB)
 * GET /api/recorded-courses/certificate/[enrollmentId] - Download certificate PDF
 * POST /api/recorded-courses/certificate/[enrollmentId] - Generate new certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateCourseCertificate } from '@/lib/course-certificate-generator';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema, getCourseById } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ enrollmentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await initCourseSchema();

    const { enrollmentId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = (decoded as any).id || (decoded as any)._id || (decoded as any).userId;

    const res = await bunnyExecute({
      sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
      args: [enrollmentId],
    });

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const enrollment: any = res.rows[0];

    if (String(enrollment.user_id) !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const course = await getCourseById(String(enrollment.course_id));

    const certificate = generateCourseCertificate({
      studentName: decoded.name || 'Student',
      studentEmail: decoded.email || '',
      courseTitle: course?.content?.en?.title || course?.slug || 'Recorded Course',
      courseInstructor: 'Swar Yoga Team',
      completionDate: new Date(),
      certificateNumber: `CERT-${enrollmentId.substring(0, 12).toUpperCase()}`,
      duration: course?.totalDuration || 0,
      progress: Number(enrollment.progress_percent || 100),
    });

    return new NextResponse(certificate as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Certificate_${enrollmentId.substring(0, 8)}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Certificate Download Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await initCourseSchema();

    const { enrollmentId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = (decoded as any).id || (decoded as any)._id || (decoded as any).userId;

    const res = await bunnyExecute({
      sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
      args: [enrollmentId],
    });

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const enrollment: any = res.rows[0];
    if (String(enrollment.user_id) !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const certificateNumber = `CERT-${enrollmentId.substring(0, 12).toUpperCase()}-${new Date().getFullYear()}`;

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO course_certificates_sql (
        id, enrollment_id, user_id, course_id, certificate_number, issued_at, data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        crypto.randomUUID(),
        enrollmentId,
        String(userId),
        String(enrollment.course_id),
        certificateNumber,
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Certificate issued',
      certificateNumber,
    });
  } catch (error: any) {
    console.error('[Certificate Generate Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
