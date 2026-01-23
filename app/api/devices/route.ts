// Get user's devices and manage them
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserDevices, removeDevice } from '@/lib/device-control';
import { apiError, apiSuccess } from '@/lib/api-error';

// GET - Get user's devices
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return apiError('Unauthorized', 401);
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return apiError('Invalid token', 401);
    }
    
    const devices = await getUserDevices(decoded.userId);
    
    return apiSuccess({ devices });
    
  } catch (error) {
    console.error('Get devices error:', error);
    return apiError('Failed to get devices', 500);
  }
}

// DELETE - Remove a device
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return apiError('Unauthorized', 401);
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return apiError('Invalid token', 401);
    }
    
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return apiError('Device ID is required', 400);
    }
    
    await removeDevice(decoded.userId, deviceId);
    
    return apiSuccess({ message: 'Device removed successfully' });
    
  } catch (error) {
    console.error('Remove device error:', error);
    return apiError('Failed to remove device', 500);
  }
}
