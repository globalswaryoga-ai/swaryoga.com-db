// Admin Device Settings API
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDeviceSettings, updateDeviceSettings } from '@/lib/device-control';
import { apiError, apiSuccess } from '@/lib/api-error';

// Mark as dynamic since this route uses request.headers
export const dynamic = 'force-dynamic';

// GET - Get device settings
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
    
    const settings = await getDeviceSettings();
    return apiSuccess({ settings });
    
  } catch (error) {
    console.error('Get device settings error:', error);
    return apiError('Failed to get settings', 500);
  }
}

// PUT - Update device settings
export async function PUT(req: NextRequest) {
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
    
    const settings = await updateDeviceSettings(body, decoded.userId || '');
    
    return apiSuccess({ message: 'Settings updated', settings });
    
  } catch (error) {
    console.error('Update device settings error:', error);
    return apiError('Failed to update settings', 500);
  }
}
