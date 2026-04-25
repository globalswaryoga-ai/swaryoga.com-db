import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getUserDevice } from '@/lib/schemas/workshopSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workshops/video/devices
 * Get user's registered devices
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const UserDevice = getUserDevice();

    const devices = await UserDevice.find({
      userId: new mongoose.Types.ObjectId(decoded.id),
      isActive: true,
    }).sort({ lastUsedAt: -1 });

    return NextResponse.json({
      success: true,
      devices: devices.map(d => ({
        id: d._id,
        deviceName: d.deviceName,
        lastUsedAt: d.lastUsedAt,
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
 * Remove a device from user's registered devices
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const UserDevice = getUserDevice();

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Verify the device belongs to the user
    const device = await UserDevice.findOne({
      _id: new mongoose.Types.ObjectId(deviceId),
      userId: new mongoose.Types.ObjectId(decoded.id),
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    await UserDevice.findByIdAndUpdate(deviceId, { isActive: false });

    return NextResponse.json({ success: true, message: 'Device removed' });
  } catch (error: any) {
    console.error('[Remove Device Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
