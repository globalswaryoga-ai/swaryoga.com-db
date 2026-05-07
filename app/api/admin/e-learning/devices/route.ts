/**
 * Admin API for Device Management
 * GET /api/admin/e-learning/devices - Get devices for user/course
 * PUT /api/admin/e-learning/devices/[id] - Block/unblock device
 * DELETE /api/admin/e-learning/devices/[id] - Delete device
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCourseDevice } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - Get devices for user/course
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

    const userId = request.nextUrl.searchParams.get('userId');
    const courseId = request.nextUrl.searchParams.get('courseId');

    const CourseDevice = getCourseDevice();

    let query: any = {};
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);
    if (courseId) query.courseId = new mongoose.Types.ObjectId(courseId);

    const devices = await CourseDevice.find(query)
      .sort({ lastUsedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      devices,
    });

  } catch (error: any) {
    console.error('[Devices GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Block/unblock device or update device info
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
    const { deviceId, ...updateData } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const CourseDevice = getCourseDevice();

    const device = await CourseDevice.findByIdAndUpdate(
      deviceId,
      { ...updateData, updatedBy: decoded.id },
      { new: true }
    );

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      device,
    });

  } catch (error: any) {
    console.error('[Devices PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete device
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

    const deviceId = request.nextUrl.searchParams.get('id');
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const CourseDevice = getCourseDevice();

    const device = await CourseDevice.findByIdAndDelete(deviceId);

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Device deleted',
    });

  } catch (error: any) {
    console.error('[Devices DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
