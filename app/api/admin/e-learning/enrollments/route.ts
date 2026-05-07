/**
 * Admin API for E-Learning Enrollments
 * GET /api/admin/e-learning/enrollments - List all enrollments
 * GET /api/admin/e-learning/enrollments?enrollmentId=... - Get enrollment details
 * PUT /api/admin/e-learning/enrollments - Update enrollment
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCourseEnrollment, getRecordedCourse, getVideoWatchLog, getCourseDevice } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List enrollments or get specific enrollment
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

    const enrollmentId = request.nextUrl.searchParams.get('enrollmentId');

    // Get specific enrollment details
    if (enrollmentId) {
      const CourseEnrollment = getCourseEnrollment();
      const VideoWatchLog = getVideoWatchLog();
      const CourseDevice = getCourseDevice();

      const enrollment = await CourseEnrollment.findById(enrollmentId)
        .populate('userId', 'name email phone image')
        .populate('courseId', 'slug content.en.title level')
        .populate('videosWatched', 'content.en.title duration')
        .lean();

      if (!enrollment) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }

      const watchLogs = await VideoWatchLog.find({ enrollmentId }).sort({ watchStarted: -1 }).limit(10).lean();
      const devices = await CourseDevice.find({ userId: enrollment.userId, courseId: enrollment.courseId }).lean();

      return NextResponse.json({
        success: true,
        enrollment,
        watchLogs,
        devices,
      });
    }

    // List all enrollments
    const userId = request.nextUrl.searchParams.get('userId');
    const courseId = request.nextUrl.searchParams.get('courseId');
    const search = request.nextUrl.searchParams.get('search');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const CourseEnrollment = getCourseEnrollment();
    const User = mongoose.models.User || mongoose.model('User');

    let query: any = {};

    if (userId) query.userId = userId;
    if (courseId) query.courseId = courseId;

    // Search by user name/email
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = users.map(u => u._id);
      if (userIds.length > 0) {
        query.userId = { $in: userIds };
      } else {
        return NextResponse.json({ success: true, enrollments: [], total: 0 });
      }
    }

    const skip = (page - 1) * limit;
    const total = await CourseEnrollment.countDocuments(query);

    const enrollments = await CourseEnrollment.find(query)
      .populate('userId', 'name email phone image')
      .populate('courseId', 'slug content.en.title level')
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      enrollments,
      total,
      page,
      pages: Math.ceil(total / limit),
    });

  } catch (error: any) {
    console.error('[Enrollments GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update enrollment (community links, hours, status, etc.)
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
    const { enrollmentId, ...updateData } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }

    const CourseEnrollment = getCourseEnrollment();

    const enrollment = await CourseEnrollment.findByIdAndUpdate(
      enrollmentId,
      updateData,
      { new: true }
    ).populate('userId', 'name email').populate('courseId', 'slug content.en.title');

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      enrollment,
    });

  } catch (error: any) {
    console.error('[Enrollments PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
