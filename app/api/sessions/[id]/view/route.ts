import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ViewTracking, Session } from '@/lib/schemas/recordedSessionsSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * PUT /api/sessions/[id]/view
 * Update viewing progress for a session
 * Tracks watched duration and marks as completed when watched >= 90%
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const { watched_duration, last_position } = await request.json();

    if (typeof watched_duration !== 'number' || watched_duration < 0) {
      return NextResponse.json(
        { error: 'watched_duration must be a positive number (seconds)' },
        { status: 400 }
      );
    }

    // Get session for total duration
    const session = await Session.findById(params.id).select('duration').lean() as any;
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const totalDurationSeconds = session.duration * 60;
    const percentageWatched = (watched_duration / totalDurationSeconds) * 100;
    const isCompleted = percentageWatched >= 90;

    // Update or create view tracking
    const viewTracking = await ViewTracking.findOneAndUpdate(
      {
        user_id: decoded.userId,
        session_id: params.id,
      },
      {
        watched_duration: Math.max(watched_duration, (await ViewTracking.findOne({user_id: decoded.userId, session_id: params.id}))?.watched_duration || 0),
        last_position: last_position || watched_duration,
        last_watched: new Date(),
        is_completed: isCompleted,
        completion_date: isCompleted ? new Date() : undefined,
        $inc: { watch_count: 0 }, // Increment only on new session
      },
      { new: true, upsert: false }
    );

    if (!viewTracking) {
      return NextResponse.json(
        { error: 'View tracking not found. Purchase session first.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: viewTracking,
        percentage_watched: Math.round(percentageWatched),
        is_completed: isCompleted,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('PUT /api/sessions/[id]/view error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/sessions/[id]/view
 * Get viewing progress for current user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const viewTracking = await ViewTracking.findOne({
      user_id: decoded.userId,
      session_id: params.id,
    })
      .select('-__v')
      .lean() as any;

    if (!viewTracking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const percentageWatched = (
      (viewTracking.watched_duration / viewTracking.total_duration) *
      100
    ).toFixed(1);

    return NextResponse.json(
      {
        success: true,
        data: viewTracking,
        percentage_watched: parseFloat(percentageWatched),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/sessions/[id]/view error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
