import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const schedule = await QRBroadcastSchedule.findOneAndUpdate(
      {
        _id: params.id,
        \$or: [{ userId: decoded?.userId || decoded?.username || 'admin' }, { createdBy: decoded?.userId || decoded?.username || 'admin' }],
      },
      {
        isActive: true,
        status: 'scheduled',
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule resumed',
      data: schedule
    });
  } catch (error) {
    console.error('[QR Broadcast Schedule Resume API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
