import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getKpMatchMaking } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    await connectDB();

    const KpMatchMaking = getKpMatchMaking();
    const records = await (KpMatchMaking as any)
      .find({})
      .populate('groomChartId', 'personName')
      .populate('brideChartId', 'personName')
      .select('label groomChartId brideChartId createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load matchmaking records';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const body = await request.json().catch(() => ({} as any));

    const groomChartId = String(body?.groomChartId || '').trim();
    const brideChartId = String(body?.brideChartId || '').trim();
    if (!groomChartId || !brideChartId) {
      return NextResponse.json({ error: 'groomChartId and brideChartId are required' }, { status: 400 });
    }

    await connectDB();

    const KpMatchMaking = getKpMatchMaking();
    const record = await (KpMatchMaking as any).create({
      label: body?.label || undefined,
      groomChartId,
      brideChartId,
      createdByUserId: viewerUserId,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create matchmaking record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
