/**

 * Admin API for Device Management (Bunny Database / LibSQL)
 * GET /api/admin/e-learning/devices - Get devices for user/course
 * PUT /api/admin/e-learning/devices - Block/unblock device
 * DELETE /api/admin/e-learning/devices - Delete device
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

export async function GET(request: NextRequest) {
  try {

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

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    const courseId = request.nextUrl.searchParams.get('courseId');


    let sql = 'SELECT * FROM course_devices_sql WHERE 1=1';
    const args: any[] = [];
    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }
    if (courseId) {
      sql += ' AND course_id = ?';
      args.push(courseId);
    }
    sql += ' ORDER BY last_active_at DESC';

    const res = await bunnyExecute({ sql, args });

    const devices = res.rows.map((r: any) => ({
      _id: r.id,
      id: r.id,
      userId: r.user_id,
      courseId: r.course_id,
      deviceFingerprint: r.device_fingerprint,
      deviceName: r.device_name,
      deviceType: r.device_type,
      browser: r.browser,
      os: r.os,
      ip: r.ip,
      isActive: Boolean(r.is_active),
      lastUsedAt: r.last_active_at || r.updated_at,
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

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();

    const { deviceId, isActive } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }


    const now = new Date().toISOString();
    await bunnyExecute({
      sql: 'UPDATE course_devices_sql SET is_active = ?, updated_at = ? WHERE id = ?',
      args: [isActive !== undefined ? (isActive ? 1 : 0) : 1, now, deviceId],
    });

    return NextResponse.json({
      success: true,

      device: { id: deviceId, _id: deviceId, isActive },
    });
  } catch (error: any) {
    console.error('[Devices PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {

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


    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const deviceId = request.nextUrl.searchParams.get('id');
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID or clearAll with userId required' }, { status: 400 });
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

export async function POST(request: NextRequest) {
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
    const { userId, courseId, deviceName, deviceType, browser, os, ip } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const devId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const fingerprint = `manual_${Math.random().toString(36).slice(2, 12)}`;

    await bunnyExecute({
      sql: `INSERT INTO course_devices_sql (
        id, user_id, course_id, device_fingerprint, device_name, device_type,
        browser, os, ip, is_active, last_active_at, data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, '{}', ?, ?)`,
      args: [
        devId,
        userId,
        courseId || null,
        fingerprint,
        deviceName || 'Authorized Device',
        deviceType || 'desktop',
        browser || 'Browser',
        os || 'System',
        ip || '127.0.0.1',
        timestamp,
        timestamp,
        timestamp,
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Device authorized',
      device: {
        _id: devId,
        id: devId,
        userId,
        courseId,
        deviceFingerprint: fingerprint,
        deviceName: deviceName || 'Authorized Device',
        deviceType: deviceType || 'desktop',
        browser: browser || 'Browser',
        os: os || 'System',
        ip: ip || '127.0.0.1',
        isActive: true,
        isBlocked: false,
        lastUsedAt: timestamp,
        registeredAt: timestamp,
      },
    });
  } catch (error: any) {
    console.error('[Devices POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
