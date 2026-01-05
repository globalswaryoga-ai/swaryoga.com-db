import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { BroadcastRun, BroadcastRunMessage, Lead } from '@/lib/schemas/enterpriseSchemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  return decoded;
}

/**
 * GET /api/admin/crm/broadcast-runs/:id
 * Details: run + per-lead status.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    verifyAdmin(request);
    const { id } = await ctx.params;

    await connectDB();

    const run = await BroadcastRun.findById(id).lean();
    if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = Math.min(Number(url.searchParams.get('limit') || 200) || 200, 500);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    const filter: any = { runId: (run as any)._id };
    if (status) filter.status = String(status);

    const total = await BroadcastRunMessage.countDocuments(filter);
    const rows = await BroadcastRunMessage.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // enrich basic lead info
    const leadIds = rows.map((r: any) => r.leadId).filter(Boolean);
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select({ _id: 1, name: 1, phoneNumber: 1, status: 1, workshopName: 1, labels: 1 })
      .lean();
    const byId = new Map(leads.map((l: any) => [String(l._id), l]));

    const messages = rows.map((m: any) => ({
      ...m,
      lead: byId.get(String(m.leadId)) || null,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          run,
          messages,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-runs/:id');
  }
}
