import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');

    const body = await req.json();
    const { studentIds, day, method } = body;
    
    if (!studentIds || !Array.isArray(studentIds) || !day || !method) {
      return apiError('VALIDATION_ERROR', 'studentIds, day, and method required');
    }

    // Mock sending messages
    console.log(`[Broadcast Mock] Sending ${day} recording to ${studentIds.length} students via ${method}`);

    return apiSuccess({ 
      success: true, 
      message: `Successfully queued ${studentIds.length} messages via ${method}`,
      sent: studentIds.length,
      failed: 0
    });
  } catch (error) {
    console.error('Workshop broadcast POST error:', error);
    return apiError('SERVER_ERROR', 'Failed to broadcast recordings');
  }
}
