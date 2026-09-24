/**
 * API to list Zoom recordings synced to S3
 * GET /api/admin/zoom/recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listBunnyZoomRecordings } from '@/lib/bunnyZoomRecordingRepository';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const { recordings, total } = await listBunnyZoomRecordings(search, page, limit);

    return NextResponse.json({
      success: true,
      recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Zoom Recordings API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}
