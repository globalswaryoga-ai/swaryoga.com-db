import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');

    // MOCK DATA for initial UI development
    const mockRecordings = {
      day1: 'https://youtube.com/watch?v=mock1',
      day2: 'https://youtube.com/watch?v=mock2',
      day3: 'https://youtube.com/watch?v=mock3',
      day4: '',
      day5: ''
    };

    return apiSuccess({ recordings: mockRecordings });
  } catch (error) {
    console.error('Workshop recordings error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch recordings');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');

    const body = await req.json();
    const { day, url } = body;
    
    if (!day || !url) return apiError('VALIDATION_ERROR', 'Day and URL required');

    // In the future this will save to BunnyDB
    return apiSuccess({ success: true, message: `Saved URL for ${day}` });
  } catch (error) {
    console.error('Workshop recordings POST error:', error);
    return apiError('SERVER_ERROR', 'Failed to save recording');
  }
}
