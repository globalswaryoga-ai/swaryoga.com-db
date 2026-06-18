import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpMatchMaking } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function guard(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return { error: unauthorized() };
  if (!isSuperAdmin(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 }) };
  }
  return { decoded };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid record id' }, { status: 400 });
    }

    await connectDB();

    const KpMatchMaking = getKpMatchMaking();
    const record = await (KpMatchMaking as any)
      .findById(id)
      .populate('groomChartId')
      .populate('brideChartId')
      .lean();
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: record }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid record id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const updates: Record<string, any> = {};
    for (const key of ['label', 'groomBhavAnalysis', 'brideBhavAnalysis', 'compatibilityNotes']) {
      if (body?.[key] !== undefined) updates[key] = body[key];
    }

    await connectDB();

    const KpMatchMaking = getKpMatchMaking();
    const record = await (KpMatchMaking as any).findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: record }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid record id' }, { status: 400 });
    }

    await connectDB();

    const KpMatchMaking = getKpMatchMaking();
    const deleted = await (KpMatchMaking as any).findByIdAndDelete(id).lean();
    if (!deleted) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
