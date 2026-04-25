// Admin Device Management API - SUPERADMIN ONLY
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  getAllUserDevices, 
  getDevicesByUser, 
  blockDevice, 
  unblockDevice,
  removeAllUserDevices,
  getDeviceStats,
} from '@/lib/device-control';

export const dynamic = 'force-dynamic';
import { apiError, apiSuccess } from '@/lib/api-error';

// GET - Get all devices or devices by user (SUPERADMIN ONLY)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return apiError('Unauthorized', 401);
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('Admin access required', 403);
    }

    // Only superadmins can access device management
    if (!isSuperAdmin(decoded)) {
      return apiError('Access denied: Superadmin access required for device management', 403);
    }
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (action === 'stats') {
      const stats = await getDeviceStats();
      return apiSuccess(stats);
    }
    
    if (userId) {
      const devices = await getDevicesByUser(userId);
      return apiSuccess({ devices });
    }
    
    const result = await getAllUserDevices(page, limit);
    return apiSuccess(result);
    
  } catch (error) {
    console.error('Admin get devices error:', error);
    return apiError('Failed to get devices', 500);
  }
}

// POST - Block/unblock device or remove all user devices
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return apiError('Unauthorized', 401);
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('Admin access required', 403);
    }
    
    const body = await req.json();
    const { action, deviceId, userId, reason } = body;
    
    if (action === 'block') {
      if (!deviceId) {
        return apiError('Device ID is required', 400);
      }
      const device = await blockDevice(deviceId, reason || 'Blocked by admin', decoded.userId || '');
      return apiSuccess({ message: 'Device blocked', device });
      
    } else if (action === 'unblock') {
      if (!deviceId) {
        return apiError('Device ID is required', 400);
      }
      const device = await unblockDevice(deviceId);
      return apiSuccess({ message: 'Device unblocked', device });
      
    } else if (action === 'removeAll') {
      if (!userId) {
        return apiError('User ID is required', 400);
      }
      await removeAllUserDevices(userId);
      return apiSuccess({ message: 'All devices removed for user' });
      
    } else {
      return apiError('Invalid action. Use: block, unblock, or removeAll', 400);
    }
    
  } catch (error) {
    console.error('Admin device action error:', error);
    return apiError('Failed to perform action', 500);
  }
}
