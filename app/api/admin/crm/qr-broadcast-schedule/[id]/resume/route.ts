import { NextRequest, NextResponse } from 'next/server';
import { connectDB, USE_BUNNY_DATABASE_ONLY } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';
import { updateBunnyQrBroadcastSchedule } from '@/lib/bunnyQrBroadcastScheduleRepository';

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

    if (!USE_BUNNY_DATABASE_ONLY && !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const userId = decoded?.userId || decoded?.username || decoded?.id || 'admin';
    const schedule = USE_BUNNY_DATABASE_ONLY
      ? await updateBunnyQrBroadcastSchedule(params.id, userId, {
        isActive: true,
        status: 'scheduled',
      })
      : await (async () => {
        await connectDB();
        return getQRBroadcastSchedule().findOneAndUpdate(
          {
            _id: params.id,
            $or: [{ userId }, { createdBy: userId }],
          },
          {
            isActive: true,
            status: 'scheduled',
            updatedAt: new Date(),
          },
          { new: true }
        ).lean();
      })();

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
