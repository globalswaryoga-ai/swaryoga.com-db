// Device Registration API - Register/update a device for a user
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { registerDevice, getLocationFromIP, checkForViolations } from '@/lib/device-control';
import { apiError, apiSuccess } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  try {
    // Verify user is logged in
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return apiError('Unauthorized', 401);
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return apiError('Invalid token', 401);
    }
    
    const userId = decoded.userId;
    const body = await req.json();
    
    const { deviceId, deviceName, deviceType, browser, os } = body;
    
    if (!deviceId || !deviceName) {
      return apiError('Device ID and name are required', 400);
    }
    
    // Get client IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || '127.0.0.1';
    
    // Get location from IP
    const location = await getLocationFromIP(ipAddress);
    
    // Register or update device
    const result = await registerDevice(
      userId,
      {
        deviceId,
        deviceName,
        deviceType: deviceType || 'desktop',
        browser: browser || 'Unknown',
        os: os || 'Unknown',
      },
      ipAddress,
      location
    );
    
    if (result.limitExceeded) {
      return apiError('Device limit exceeded. You can only register up to 3 devices.', 403);
    }
    
    // Check for violations (location mismatch, etc.)
    const violationCheck = await checkForViolations(
      userId,
      deviceId,
      deviceName,
      location,
      ipAddress
    );
    
    return apiSuccess({
      device: result.device,
      isNew: result.isNew,
      violation: violationCheck.hasViolation ? violationCheck : null,
    });
    
  } catch (error) {
    console.error('Device registration error:', error);
    return apiError('Failed to register device', 500);
  }
}
