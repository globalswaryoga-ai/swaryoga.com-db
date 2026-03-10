import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter } from '@/lib/crm-handlers';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/whatsapp/window-status?leadIds=id1,id2,...
 * Returns the Meta 24-hour messaging window status for each lead.
 * 
 * Response: { windows: { [leadId]: { lastInboundAt: string | null, expiresAt: string | null, isOpen: boolean } } }
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded);

    const leadIdsParam = request.nextUrl.searchParams.get('leadIds') || '';
    const leadIds = leadIdsParam.split(',').filter(Boolean);

    if (leadIds.length === 0) {
      return NextResponse.json({ windows: {} });
    }

    // Cap at 200 to prevent huge queries
    const limitedIds = leadIds.slice(0, 200);

    await connectDB();

    // Aggregate: find the most recent inbound message per lead within last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const WaMsg = getWhatsAppMessage();
    const results = await WaMsg.aggregate([
      {
        $match: {
          leadId: { $in: limitedIds.map(id => new mongoose.Types.ObjectId(id)) },
          direction: 'inbound',
          provider: 'meta',
          sentAt: { $gte: cutoff },
          ...tf,
        },
      },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: '$leadId',
          lastInboundAt: { $first: '$sentAt' },
        },
      },
    ]);

    const windows: Record<string, { lastInboundAt: string | null; expiresAt: string | null; isOpen: boolean }> = {};

    // Initialize all requested leads as closed
    for (const id of limitedIds) {
      windows[id] = { lastInboundAt: null, expiresAt: null, isOpen: false };
    }

    // Fill in leads that have an open window
    const now = Date.now();
    for (const doc of results) {
      const leadId = String(doc._id);
      const lastInbound = new Date(doc.lastInboundAt);
      const expiresAt = new Date(lastInbound.getTime() + 24 * 60 * 60 * 1000);
      const isOpen = expiresAt.getTime() > now;

      windows[leadId] = {
        lastInboundAt: lastInbound.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isOpen,
      };
    }

    return NextResponse.json({ windows });
  } catch (err: any) {
    console.error('[window-status] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
