/**
 * Admin API for Certificates
 * GET /api/admin/e-learning/certificates - List certificates
 * POST /api/admin/e-learning/certificates - Issue certificate
 * DELETE /api/admin/e-learning/certificates - Revoke certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCourseEnrollment } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - Get certificates for course/user
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

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

    const CourseEnrollment = getCourseEnrollment();

    let query: any = { certificateIssued: true };
    if (courseId) query.courseId = new mongoose.Types.ObjectId(courseId);
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);

    const enrollments = await CourseEnrollment.find(query)
      .populate('userId', 'name email')
      .populate('courseId', 'content.en.title')
      .sort({ certificateIssuedAt: -1 })
      .lean();

    const certificates = enrollments.map((e: any) => ({
      enrollmentId: e._id,
      userId: e.userId,
      courseId: e.courseId,
      certificateUrl: e.certificateUrl,
      certificateIssuedAt: e.certificateIssuedAt,
    }));

    return NextResponse.json({
      success: true,
      certificates,
    });

  } catch (error: any) {
    console.error('[Certificates GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Issue certificate
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

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
    const { enrollmentId, certificateUrl } = body;

    if (!enrollmentId || !certificateUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const CourseEnrollment = getCourseEnrollment();

    const enrollment = await CourseEnrollment.findByIdAndUpdate(
      enrollmentId,
      {
        certificateIssued: true,
        certificateUrl,
        certificateIssuedAt: new Date(),
      },
      { new: true }
    ).populate('userId', 'name email').populate('courseId', 'content.en.title');

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      enrollment,
    });

  } catch (error: any) {
    console.error('[Certificates POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Revoke certificate
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

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

    const enrollmentId = request.nextUrl.searchParams.get('id');
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }

    const CourseEnrollment = getCourseEnrollment();

    const enrollment = await CourseEnrollment.findByIdAndUpdate(
      enrollmentId,
      {
        certificateIssued: false,
        certificateUrl: null,
        certificateIssuedAt: null,
      },
      { new: true }
    );

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate revoked',
    });

  } catch (error: any) {
    console.error('[Certificates DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
