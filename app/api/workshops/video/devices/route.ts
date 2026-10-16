import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listDevices } from '@/lib/bunnyCourseRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workshops/video/devices
 * Get user's registered devices (BunnyDB)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    
    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const devices = await listDevices(String(userId));

    return NextResponse.json({
      success: true,
      devices: devices.map(d => ({
        id: d.id,
        deviceName: d.deviceName || d.deviceType || 'Device',
        lastUsedAt: d.lastActiveAt,
        registeredAt: d.createdAt,
      })),
      maxDevices: 3,
    });
  } catch (error: any) {
    console.error('[Get Devices Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/workshops/video/devices
 * Remove a device from user's registered devices (BunnyDB)
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    
    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'UPDATE course_devices_sql SET is_active = 0 WHERE id = ? AND user_id = ?',
      args: [deviceId, String(userId)],
    });

    return NextResponse.json({ success: true, message: 'Device removed' });
  } catch (error: any) {
    console.error('[Remove Device Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
