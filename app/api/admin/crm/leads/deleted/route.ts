import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { DeletedLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


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
 * GET /api/admin/crm/leads/deleted
 * List deleted leads with permanent leadNumber snapshot.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);
    const userIdParam = url.searchParams.get('userId');
    const q = url.searchParams.get('q');

    await connectDB();

    // System-auto-deleted records (deletedByUserId = 'system' or 'system-backfill')
    // must be visible to ALL admins — they are not "owned" by any one user.
    const SYSTEM_DELETORS = ['system', 'system-backfill'];
    const systemClause = { deletedByUserId: { $in: SYSTEM_DELETORS } };

    const filter: any = {};

    if (superAdmin) {
      if (userIdParam && String(userIdParam).trim()) {
        // Super-admin filtered to a specific user: their records + system records
        filter.$or = [
          { assignedToUserId: String(userIdParam).trim() },
          systemClause,
        ];
      }
      // else: no filter — see everything
    } else {
      // Regular admin: own records (assigned/created/deleted by them) + all system-deleted records
      filter.$or = [
        { assignedToUserId: viewerUserId },
        { createdByUserId: viewerUserId },
        { deletedByUserId: viewerUserId },
        systemClause,
      ];
    }

    // Reason filter (from dropdown)
    const reasonParam = url.searchParams.get('reason');
    if (reasonParam && String(reasonParam).trim()) {
      filter.deletedReason = String(reasonParam).trim();
    }

    // Base filter for stat card counts (no search/reason sub-filter, just ownership)
    const baseFilter: any = superAdmin && !userIdParam
      ? {}
      : superAdmin && userIdParam
        ? { $or: [{ assignedToUserId: String(userIdParam).trim() }, systemClause] }
        : { $or: [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }, { deletedByUserId: viewerUserId }, systemClause] };

    if (q && String(q).trim()) {
      const query = String(q).trim();
      // Merge search into existing $or by wrapping in $and
      const searchOr = [
        { leadNumber: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const deletedLeads = await DeletedLead.find(filter)
      .sort({ deletedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DeletedLead.countDocuments(filter);

    const reasonAgg = await DeletedLead.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$deletedReason', count: { $sum: 1 } } },
    ]);
    const reasonCounts: Record<string, number> = {};
    for (const r of reasonAgg) reasonCounts[String(r._id ?? 'manual')] = Number(r.count);

    return NextResponse.json(
      { success: true, data: { deletedLeads, total, limit, skip, reasonCounts } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load deleted leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
