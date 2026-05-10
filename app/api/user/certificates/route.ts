/**
 * User Certificates API
 * GET /api/user/certificates - Get all certificates for logged-in user
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCourseEnrollment } from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;

    const CourseEnrollment = getCourseEnrollment();

    // Get all completed enrollments with certificates issued
    const certificates = await CourseEnrollment.find({
      userId: userId,
      certificateIssued: true,
      status: 'completed',
    })
      .populate('courseId', 'content title instructor totalDuration')
      .sort({ certificateIssuedAt: -1 })
      .lean();

    const data = certificates.map((cert: any) => ({
      enrollmentId: cert._id,
      certificateNumber: cert.certificateNumber || `CERT-${cert._id.toString().substring(0, 12).toUpperCase()}`,
      courseTitle: cert.courseId?.content?.en?.title || cert.courseId?.title || 'Course',
      courseInstructor: cert.courseId?.instructor || 'Instructor',
      completionDate: cert.completedAt,
      certificateIssuedAt: cert.certificateIssuedAt,
      progress: cert.progress,
    }));

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error: any) {
    console.error('[User Certificates Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
