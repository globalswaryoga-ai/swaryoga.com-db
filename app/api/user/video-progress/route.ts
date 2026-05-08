/**
 * Video Watch Progress API
 * POST /api/user/video-progress - Record video watch progress
 * GET /api/user/video-progress - Get user's watch progress
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { getVideoWatchLog } from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

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

    const body = await request.json();
    const { courseId, videoId, progress, isCompleted } = body;

    if (!courseId || !videoId) {
      return NextResponse.json({ error: 'Course and video IDs required' }, { status: 400 });
    }

    const VideoWatchLog = getVideoWatchLog();

    // Update or create watch log
    const watchLog = await VideoWatchLog.findOneAndUpdate(
      {
        userId: decoded.id,
        courseId,
        videoId,
      },
      {
        userId: decoded.id,
        courseId,
        videoId,
        progress: progress || 0,
        isCompleted: isCompleted || false,
        lastWatchedAt: new Date(),
        watchDuration: (watchLog?.watchDuration || 0) + 1, // Increment by 1 second per update
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      watchLog,
    });
  } catch (error: any) {
    console.error('[Video Progress API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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

    const courseId = request.nextUrl.searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const VideoWatchLog = getVideoWatchLog();

    const watchLogs = await VideoWatchLog.find({
      userId: decoded.id,
      courseId,
    }).lean();

    return NextResponse.json({
      success: true,
      watchLogs,
    });
  } catch (error: any) {
    console.error('[Get Video Progress API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
