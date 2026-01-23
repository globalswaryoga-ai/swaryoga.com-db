// Stream control API - Start/stop/heartbeat for video streaming
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { startStream, sendStreamHeartbeat, endStream, getLocationFromIP } from '@/lib/device-control';
import { apiError, apiSuccess } from '@/lib/api-error';

// POST - Start or heartbeat a stream
export async function POST(req: NextRequest) {
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
    
    const userId = decoded.userId;
    const body = await req.json();
    const { action, deviceId, videoId, communityId } = body;
    
    if (!deviceId) {
      return apiError('Device ID is required', 400);
    }
    
    // Get client IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || '127.0.0.1';
    
    if (action === 'start') {
      if (!videoId) {
        return apiError('Video ID is required to start stream', 400);
      }
      
      // Get location
      const location = await getLocationFromIP(ipAddress);
      
      const result = await startStream(
        userId,
        deviceId,
        videoId,
        communityId || '',
        ipAddress,
        location
      );
      
      if (!result.allowed) {
        return apiError(
          `Video is already playing on ${result.existingStream?.deviceName} in ${result.existingStream?.location}. Only 1 device can stream at a time.`,
          409
        );
      }
      
      return apiSuccess({ message: 'Stream started', allowed: true });
      
    } else if (action === 'heartbeat') {
      await sendStreamHeartbeat(userId, deviceId);
      return apiSuccess({ message: 'Heartbeat received' });
      
    } else if (action === 'end') {
      await endStream(userId, deviceId);
      return apiSuccess({ message: 'Stream ended' });
      
    } else {
      return apiError('Invalid action. Use: start, heartbeat, or end', 400);
    }
    
  } catch (error) {
    console.error('Stream control error:', error);
    return apiError('Failed to control stream', 500);
  }
}
