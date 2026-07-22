import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getBroadcastRunMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cap the number of leadIds accepted per request — the Select Recipients
// panel currently loads up to 5000 leads, so this needs headroom above that.
const MAX_LEAD_IDS = 6000;

/**
 * POST /api/admin/crm/broadcast-runs/latest-status
 *
 * For the Meta broadcast "Select Recipients" panel: given a list of leadIds
 * (already tenant-scoped — they came from the caller's own /api/admin/crm/leads
 * fetch), returns each lead's most recent Meta WhatsApp message status
 * (delivered/read/failed/blocked/...) so the panel can filter by it and let
 * the admin re-target people who were previously delivered/read.
 *
 * We trust the caller-supplied leadIds for scoping (rather than re-deriving
 * tenant ownership on BroadcastRunMessage, which has no createdByUserId field
 * of its own) — the same guarantee /api/admin/crm/leads already enforced.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds : [];
    if (leadIds.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    const objectIds = leadIds
      .slice(0, MAX_LEAD_IDS)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    await connectDB();
    const BroadcastRunMessage = getBroadcastRunMessage();

    const latest = await BroadcastRunMessage.aggregate([
      { $match: { leadId: { $in: objectIds }, provider: 'meta' } },
      { $sort: { leadId: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$leadId',
          status: { $first: '$status' },
          updatedAt: { $first: '$createdAt' },
        },
      },
    ]);

    const data: Record<string, { status: string; updatedAt: string }> = {};
    for (const row of latest as any[]) {
      data[String(row._id)] = { status: row.status, updatedAt: row.updatedAt };
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Broadcast latest-status] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
