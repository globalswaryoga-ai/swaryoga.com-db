/**
 * API to list Zoom recordings synced to S3
 * GET /api/admin/zoom/recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getZoomRecordingSync } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const ZoomRecordingSync = getZoomRecordingSync();

    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // Build query
    const query: any = {};
    if (search) {
      query.topic = { $regex: search, $options: 'i' };
    }

    // Get recordings
    const recordings = await ZoomRecordingSync.find(query)
      .sort({ syncedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await ZoomRecordingSync.countDocuments(query);

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
