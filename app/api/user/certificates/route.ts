/**
 * User Certificates API
 * GET /api/user/certificates - Get all certificates for logged-in user
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  listCertificatesByUser,
  listEnrollmentsByUser,
  getCourseById,
} from '@/lib/bunnyCourseRepository';

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

    const [certificates, enrollments] = await Promise.all([
      listCertificatesByUser(String(userId)),
      listEnrollmentsByUser(String(userId)),
    ]);

    const completedEnrollments = enrollments.filter(
      (e) => e.status === 'completed' || e.data?.certificateIssued
    );

    const data: any[] = [];

    for (const cert of certificates) {
      const course = await getCourseById(cert.courseId);
      data.push({
        enrollmentId: cert.enrollmentId,
        certificateNumber: cert.certificateNumber || `CERT-${cert.id.substring(0, 12).toUpperCase()}`,
        courseTitle: (course?.content as any)?.en?.title || course?.slug || 'Course',
        courseInstructor: (course as any)?.instructor || 'Instructor',
        completionDate: cert.issuedAt,
        certificateIssuedAt: cert.issuedAt,
        progress: cert.data?.progress || 100,
      });
    }

    // Also include any completed enrollments that don't yet have an entry in course_certificates_sql
    for (const enr of completedEnrollments) {
      if (!data.some((d) => d.enrollmentId === enr.id)) {
        const course = await getCourseById(enr.courseId);
        data.push({
          enrollmentId: enr.id,
          certificateNumber: enr.data?.certificateNumber || `CERT-${enr.id.substring(0, 12).toUpperCase()}`,
          courseTitle: (course?.content as any)?.en?.title || course?.slug || 'Course',
          courseInstructor: (course as any)?.instructor || 'Instructor',
          completionDate: enr.updatedAt || enr.enrolledAt,
          certificateIssuedAt: enr.updatedAt || enr.enrolledAt,
          progress: enr.progressPercent || 100,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[User Certificates Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
