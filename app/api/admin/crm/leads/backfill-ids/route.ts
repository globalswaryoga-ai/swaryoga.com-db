import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return (
    decoded?.userId === 'admin' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'))
  );
}

/**
 * POST /api/admin/crm/leads/backfill-ids
 * Assign missing leadNumber values to existing leads (super-admin only).
 *
 * Query params:
 * - limit (default 500, max 2000): how many leads to backfill in this run
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 500) || 500, 2000);

    await connectDB();

    const missingFilter: any = {
      $or: [{ leadNumber: { $exists: false } }, { leadNumber: null }, { leadNumber: '' }],
    };

    // Backfill oldest-first for deterministic numbering.
    const leads = await Lead.find(missingFilter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .select({ _id: 1 })
      .lean();

    let updated = 0;
    let lastAssigned: string | null = null;

    for (const l of leads) {
      const { leadNumber } = await allocateNextLeadNumber();
      const res = await Lead.updateOne(
        { _id: l._id, ...missingFilter },
        { $set: { leadNumber } }
      );
      if (res.modifiedCount > 0) {
        updated++;
        lastAssigned = leadNumber;
      }
    }

    const remaining = await Lead.countDocuments(missingFilter);

    return NextResponse.json(
      {
        success: true,
        data: {
          updated,
          lastAssigned,
          remaining,
          ranLimit: limit,
        },
        message: updated > 0 ? `Backfilled ${updated} lead IDs` : 'No leads needed backfill',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backfill failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
