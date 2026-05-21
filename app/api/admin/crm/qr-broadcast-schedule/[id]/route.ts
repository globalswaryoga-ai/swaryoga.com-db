import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const schedule = await QRBroadcastSchedule.findOne({
      _id: params.id,
      userId: decoded.userId,
      tenantId: decoded.tenantId || 'default',
    }).lean();

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('[QR Broadcast Schedule API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    // Validate max messages per day if updating
    if (body.maxMessagesPerDay && (body.maxMessagesPerDay < 1 || body.maxMessagesPerDay > 300)) {
      return NextResponse.json(
        { error: 'maxMessagesPerDay must be 1-300' },
        { status: 400 }
      );
    }

    const schedule = await QRBroadcastSchedule.findOneAndUpdate(
      {
        _id: params.id,
        userId: decoded.userId,
        tenantId: decoded.tenantId || 'default',
      },
      {
        ...body,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('[QR Broadcast Schedule API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const deleted = await QRBroadcastSchedule.findOneAndDelete({
      _id: params.id,
      userId: decoded.userId,
      tenantId: decoded.tenantId || 'default',
    }).lean();

    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    console.error('[QR Broadcast Schedule API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
