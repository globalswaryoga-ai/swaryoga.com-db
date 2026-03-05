// Admin Violations Management API
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViolations, getViolationsByUser, markViolationReviewed } from '@/lib/device-control';
import { apiError, apiSuccess } from '@/lib/api-error';

// GET - Get violations
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
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const unreviewed = searchParams.get('unreviewed') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (userId) {
      const violations = await getViolationsByUser(userId);
      return apiSuccess({ violations });
    }
    
    const result = await getViolations(page, limit, unreviewed);
    return apiSuccess(result);
    
  } catch (error) {
    console.error('Admin get violations error:', error);
    return apiError('Failed to get violations', 500);
  }
}

// POST - Mark violation as reviewed
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
    const { violationId, notes } = body;
    
    if (!violationId) {
      return apiError('Violation ID is required', 400);
    }
    
    const violation = await markViolationReviewed(violationId, decoded.userId || '', notes);
    
    return apiSuccess({ message: 'Violation marked as reviewed', violation });
    
  } catch (error) {
    console.error('Admin review violation error:', error);
    return apiError('Failed to review violation', 500);
  }
}
