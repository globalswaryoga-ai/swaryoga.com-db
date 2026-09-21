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
    const mockStudents = [
      { id: '1', name: 'Rahul Sharma', phone: '+919876543210', source: 'WhatsApp', day1: true, day2: false, day3: true },
      { id: '2', name: 'Priya Desai', phone: '+919876543211', source: 'Zoom', day1: true, day2: true, day3: true },
      { id: '3', name: 'Amit Patel', phone: '+919876543212', source: 'Leads', day1: false, day2: true, day3: false },
      { id: '4', name: 'Neha Singh', phone: '+919876543213', source: 'WhatsApp', day1: true, day2: true, day3: false },
      { id: '5', name: 'Vikram Mehta', phone: '+919876543214', source: 'Zoom', day1: false, day2: false, day3: true },
      { id: '6', name: 'Anjali Gupta', phone: '+919876543215', source: 'WhatsApp', day1: true, day2: true, day3: true },
      { id: '7', name: 'Rohan Verma', phone: '+919876543216', source: 'Leads', day1: true, day2: false, day3: false },
    ];

    return apiSuccess({ students: mockStudents });
  } catch (error) {
    console.error('Workshop students error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch students');
  }
}
