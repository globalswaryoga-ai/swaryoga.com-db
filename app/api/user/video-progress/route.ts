/**
 * Video Watch Progress API
 * POST /api/user/video-progress - Record video watch progress
 * GET /api/user/video-progress - Get user's watch progress
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { logWatchProgress, listWatchLogs } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const body = await request.json();
    const { courseId, videoId, progress, isCompleted } = body;

    if (!courseId || !videoId) {
      return NextResponse.json({ error: 'Course and video IDs required' }, { status: 400 });
    }

    await logWatchProgress(
      String(userId),
      String(videoId),
      String(courseId),
      Number(progress || 0),
      Boolean(isCompleted)
    );

    return NextResponse.json({
      success: true,
      message: 'Watch progress saved',
    });
  } catch (error: any) {
    console.error('[Video Progress API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const courseId = request.nextUrl.searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const watchLogs = await listWatchLogs(String(userId), courseId);

    return NextResponse.json({
      success: true,
      watchLogs,
    });
  } catch (error: any) {
    console.error('[Video Progress API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
