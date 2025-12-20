import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Session, Purchase, ViewTracking } from '@/lib/schemas/recordedSessionsSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/sessions/[id]
 * Get single session details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const session = await Session.findById(params.id)
      .select('-__v')
      .lean();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Increment view count (fire-and-forget)
    Session.findByIdAndUpdate(params.id, { $inc: { views: 1 } }).catch((err) =>
      console.error('Failed to increment views:', err)
    );

    return NextResponse.json(
      { success: true, data: session },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } }
    );
  } catch (error: any) {
    console.error('GET /api/sessions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/sessions/[id]
 * Update session (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const body = await request.json();

    const session = await Session.findByIdAndUpdate(
      params.id,
      { ...body, updated_at: new Date() },
      { new: true }
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: session }, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/sessions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete session (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const session = await Session.findByIdAndDelete(params.id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Clean up related purchases and view tracking
    await Promise.all([
      Purchase.deleteMany({ session_id: params.id }),
      ViewTracking.deleteMany({ session_id: params.id }),
    ]);

    return NextResponse.json(
      { success: true, message: 'Session deleted' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE /api/sessions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
