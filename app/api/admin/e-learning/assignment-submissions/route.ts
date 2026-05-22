/**
 * Admin API for Assignment Submissions & Grading
 * GET /api/admin/e-learning/assignment-submissions - Get submissions for assignment/student
 * POST /api/admin/e-learning/assignment-submissions - Student submits assignment
 * PUT /api/admin/e-learning/assignment-submissions - Grade submission
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
 * GET - Get submissions for assignment or student
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

    const assignmentId = request.nextUrl.searchParams.get('assignmentId');
    const enrollmentId = request.nextUrl.searchParams.get('enrollmentId');

    const CourseEnrollment = getCourseEnrollment();

    let query: any = {};

    if (assignmentId) {
      query['assignmentsCompleted.assignmentId'] = new mongoose.Types.ObjectId(assignmentId);
    }

    if (enrollmentId) {
      query._id = new mongoose.Types.ObjectId(enrollmentId);
    }

    const enrollments = await CourseEnrollment.find(query)
      .populate('userId', 'name email')
      .lean();

    // Extract assignment completions
    const submissions = enrollments.flatMap((enrollment: any) =>
      (enrollment.assignmentsCompleted || []).map((completion: any) => ({
        ...completion,
        enrollmentId: enrollment._id,
        userId: enrollment.userId,
      }))
    );

    return NextResponse.json({
      success: true,
      submissions,
    });

  } catch (error: any) {
    console.error('[Submissions GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Grade assignment submission
 */
export async function PUT(request: NextRequest) {
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
    const { enrollmentId, assignmentId, score } = body;

    if (!enrollmentId || !assignmentId || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const CourseEnrollment = getCourseEnrollment();

    const enrollment = await CourseEnrollment.findById(enrollmentId);
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Find and update the assignment completion
    const assignmentIndex = enrollment.assignmentsCompleted.findIndex(
      (a: any) => a.assignmentId.toString() === assignmentId
    );

    if (assignmentIndex === -1) {
      return NextResponse.json({ error: 'Assignment not submitted' }, { status: 404 });
    }

    (enrollment.assignmentsCompleted[assignmentIndex] as any).score = score;
    (enrollment.assignmentsCompleted[assignmentIndex] as any).gradedAt = new Date();
    (enrollment.assignmentsCompleted[assignmentIndex] as any).gradedBy = (decoded as any).id;

    await enrollment.save();

    return NextResponse.json({
      success: true,
      enrollment,
    });

  } catch (error: any) {
    console.error('[Submissions PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
