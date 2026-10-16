/**
 * Admin API for Device Management (BunnyDB)
 * GET /api/admin/e-learning/devices - Get devices for user/course
 * PUT /api/admin/e-learning/devices - Block/unblock device
 * DELETE /api/admin/e-learning/devices - Delete device
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

export async function GET(request: NextRequest) {
  try {
    await initCourseSchema();

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

    const conditions: string[] = [];
    const args: any[] = [];

    if (userId) {
      conditions.push('user_id = ?');
      args.push(userId);
    }
    if (courseId) {
      conditions.push('course_id = ?');
      args.push(courseId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await bunnyExecute({
      sql: `SELECT * FROM course_devices_sql ${where} ORDER BY last_active_at DESC`,
      args,
    });

    const devices = res.rows.map((row: any) => ({
      _id: String(row.id),
      id: String(row.id),
      userId: row.user_id,
      courseId: row.course_id,
      deviceFingerprint: row.device_fingerprint,
      deviceName: row.device_name,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      ip: row.ip,
      isActive: Boolean(row.is_active),
      lastActiveAt: row.last_active_at,
      lastUsedAt: row.last_active_at,
    }));

    return NextResponse.json({
      success: true,
      devices,
    });
  } catch (error: any) {
    console.error('[Devices GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initCourseSchema();

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
    const { deviceId, isActive, isBlocked } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const activeVal = isBlocked !== undefined ? (isBlocked ? 0 : 1) : isActive !== undefined ? (isActive ? 1 : 0) : 1;

    await bunnyExecute({
      sql: 'UPDATE course_devices_sql SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [activeVal, deviceId],
    });

    return NextResponse.json({
      success: true,
      message: 'Device updated',
    });
  } catch (error: any) {
    console.error('[Devices PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initCourseSchema();

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

    await bunnyExecute({
      sql: 'DELETE FROM course_devices_sql WHERE id = ?',
      args: [deviceId],
    });

    return NextResponse.json({
      success: true,
      message: 'Device deleted',
    });
  } catch (error: any) {
    console.error('[Devices DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
