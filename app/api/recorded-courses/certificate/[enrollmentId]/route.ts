/**
 * Course Certificate API
 * GET /api/recorded-courses/certificate/[enrollmentId] - Download certificate PDF
 * POST /api/recorded-courses/certificate/[enrollmentId]/generate - Generate new certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCourseEnrollment, getRecordedCourse } from '@/lib/schemas/recordedCourseSchemas';
import { generateCourseCertificate } from '@/lib/course-certificate-generator';

interface RouteParams {
  params: Promise<{ enrollmentId: string }>;
}

/**
 * GET - Download certificate PDF
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { enrollmentId } = await params;

    // Verify auth
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
    const RecordedCourse = getRecordedCourse();

    // Get enrollment
    const enrollment = await CourseEnrollment.findById(enrollmentId)
      .populate('courseId')
      .populate('userId', 'name email');

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Check ownership (user can only download their own certificate)
    if (enrollment.userId._id.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if completed and certificate is available
    if (!enrollment.certificateIssued || enrollment.status !== 'completed') {
      return NextResponse.json({
        error: 'Certificate not available',
        message: 'Complete the course to receive your certificate',
      }, { status: 403 });
    }

    // Generate certificate
    const course: any = enrollment.courseId;
    const enrollmentUser: any = enrollment.userId;
    const enrollmentAny: any = enrollment;
    const certificate = generateCourseCertificate({
      studentName: enrollmentUser.name,
      studentEmail: enrollmentUser.email,
      courseTitle: course.content?.en?.title || course.title || 'Course',
      courseInstructor: course.instructor || 'Swar Yoga',
      completionDate: enrollmentAny.completedAt || enrollmentAny.certificateIssuedAt || new Date(),
      certificateNumber: enrollmentAny.certificateNumber || `CERT-${enrollmentId.substring(0, 12).toUpperCase()}`,
      duration: course.totalDuration || 0,
      progress: enrollment.progress,
    });

    // Stream PDF response
    return new NextResponse(certificate as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${enrollmentUser.name.replace(/\s+/g, '_')}_${course.content?.en?.title?.replace(/\s+/g, '_') || 'Certificate'}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('[Certificate Download Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Generate/issue certificate (auto-issue when course completed)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { enrollmentId } = await params;

    // Verify auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const CourseEnrollment = getCourseEnrollment();

    // Get enrollment
    const enrollment = await CourseEnrollment.findById(enrollmentId);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Check if user owns this enrollment
    const userId = decoded.id || decoded._id || decoded.userId;
    if (enrollment.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only issue certificate if course is completed
    if (enrollment.status !== 'completed') {
      return NextResponse.json({
        error: 'Course not completed',
        message: 'Complete all course videos to receive a certificate',
      }, { status: 400 });
    }

    // Generate certificate number if not exists
    const enrollmentAny2: any = enrollment;
    const certificateNumber = enrollmentAny2.certificateNumber || `CERT-${enrollmentId.substring(0, 12).toUpperCase()}-${new Date().getFullYear()}`;

    // Update enrollment with certificate info
    const updated = await CourseEnrollment.findByIdAndUpdate(
      enrollmentId,
      {
        certificateIssued: true,
        certificateNumber,
        certificateIssuedAt: new Date(),
        completedAt: enrollmentAny2.completedAt || new Date(),
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Certificate issued',
      certificateNumber,
      enrollment: updated,
    });

  } catch (error: any) {
    console.error('[Certificate Generate Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
