/**
<<<<<<< HEAD
 * Admin API for Device Management (BunnyDB)
=======
 * Admin API for Device Management (Bunny Database / LibSQL)
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
 * GET /api/admin/e-learning/devices - Get devices for user/course
 * PUT /api/admin/e-learning/devices - Block/unblock device
 * DELETE /api/admin/e-learning/devices - Delete device
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
<<<<<<< HEAD
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema } from '@/lib/bunnyCourseRepository';
=======
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
    await initCourseSchema();

=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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
<<<<<<< HEAD
    await initCourseSchema();

=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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
<<<<<<< HEAD
    const { deviceId, isActive, isBlocked } = body;
=======
    const { deviceId, isActive } = body;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

<<<<<<< HEAD
    const activeVal = isBlocked !== undefined ? (isBlocked ? 0 : 1) : isActive !== undefined ? (isActive ? 1 : 0) : 1;

    await bunnyExecute({
      sql: 'UPDATE course_devices_sql SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [activeVal, deviceId],
=======
    const now = new Date().toISOString();
    await bunnyExecute({
      sql: 'UPDATE course_devices_sql SET is_active = ?, updated_at = ? WHERE id = ?',
      args: [isActive !== undefined ? (isActive ? 1 : 0) : 1, now, deviceId],
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    });

    return NextResponse.json({
      success: true,
<<<<<<< HEAD
      message: 'Device updated',
=======
      device: { id: deviceId, _id: deviceId, isActive },
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    });
  } catch (error: any) {
    console.error('[Devices PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
<<<<<<< HEAD
    await initCourseSchema();

=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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

<<<<<<< HEAD
    const clearAll = request.nextUrl.searchParams.get('clearAll') === 'true';
    const userId = request.nextUrl.searchParams.get('userId');

    if (clearAll && userId) {
      await bunnyExecute({
        sql: 'DELETE FROM course_devices_sql WHERE user_id = ?',
        args: [userId],
      });
      return NextResponse.json({
        success: true,
        message: 'All devices reset for user',
      });
=======
    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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
