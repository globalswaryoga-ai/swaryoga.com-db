// Acknowledge a violation (user clicked "It's me, ignore")
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { acknowledgeViolation } from '@/lib/device-control';
import { apiError, apiSuccess } from '@/lib/api-error';

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
    
    const body = await req.json();
    const { violationId } = body;
    
    if (!violationId) {
      return apiError('Violation ID is required', 400);
    }
    
    const violation = await acknowledgeViolation(violationId);
    
    return apiSuccess({ message: 'Violation acknowledged', violation });
    
  } catch (error) {
    console.error('Acknowledge violation error:', error);
    return apiError('Failed to acknowledge violation', 500);
  }
}
