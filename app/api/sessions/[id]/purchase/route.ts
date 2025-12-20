import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Purchase, Session, ViewTracking } from '@/lib/schemas/recordedSessionsSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * POST /api/sessions/[id]/purchase
 * Create purchase/enrollment for session
 * Handles payment processing and creates view tracking record
 */
export async function POST(
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

    const body = await request.json();
    const { payment_method = 'stripe', subscription_type = 'one-time', transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json(
        { error: 'transaction_id is required' },
        { status: 400 }
      );
    }

    // Get session details
    const session = await Session.findById(params.id).lean() as any;
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if already purchased
    const existingPurchase = await Purchase.findOne({
      user_id: decoded.userId,
      session_id: params.id,
      status: 'completed',
    }).lean();

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Already purchased this session' },
        { status: 400 }
      );
    }

    // Create purchase record
    const purchase = await Purchase.create({
      user_id: decoded.userId,
      session_id: params.id,
      amount: session.price,
      currency: 'USD',
      payment_method,
      transaction_id,
      status: 'completed', // In production, verify with payment gateway first
      subscription_type,
      subscription_end_date:
        subscription_type === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : subscription_type === 'yearly'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : undefined,
    });

    // Create view tracking record
    await ViewTracking.create({
      user_id: decoded.userId,
      session_id: params.id,
      total_duration: session.duration * 60, // Convert to seconds
      watched_duration: 0,
      is_completed: false,
    });

    return NextResponse.json(
      {
        success: true,
        data: { purchase, session },
        message: 'Purchase successful! Video is now available.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/sessions/[id]/purchase error:', error);

    // Duplicate transaction ID
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate transaction. Please use a new transaction ID.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
