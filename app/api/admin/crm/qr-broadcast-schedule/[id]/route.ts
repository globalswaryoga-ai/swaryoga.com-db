import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function getUserId(decoded: any): string {
  return decoded?.userId || decoded?.username || decoded?.id || 'admin';
}

function ownerFilter(decoded: any, id: string) {
  const uid = getUserId(decoded);
  return { _id: id, $or: [{ userId: uid }, { createdBy: uid }] };
}

function checkAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) return null;
  return decoded;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = checkAuth(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();
    const schedule = await QRBroadcastSchedule.findOne(ownerFilter(decoded, params.id)).lean();

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('[QR Broadcast Schedule GET/:id] Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = checkAuth(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    if (body.maxMessagesPerDay && (body.maxMessagesPerDay < 1 || body.maxMessagesPerDay > 300)) {
      return NextResponse.json({ error: 'maxMessagesPerDay must be 1-300' }, { status: 400 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();

    // Exclude immutable fields from update
    const { _id, userId, createdBy, createdAt, ...updateFields } = body;

    const schedule = await QRBroadcastSchedule.findOneAndUpdate(
      ownerFilter(decoded, params.id),
      { $set: { ...updateFields, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('[QR Broadcast Schedule PUT/:id] Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = checkAuth(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();
    const deleted = await QRBroadcastSchedule.findOneAndDelete(ownerFilter(decoded, params.id)).lean();

    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    console.error('[QR Broadcast Schedule DELETE/:id] Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
