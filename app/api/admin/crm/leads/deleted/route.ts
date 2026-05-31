import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { DeletedLead } from '@/lib/schemas/enterpriseSchemas';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

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

    const filter: any = {};

    if (superAdmin) {
      if (userIdParam && String(userIdParam).trim()) {
        filter.$or = [
          { assignedToUserId: String(userIdParam).trim() },
          { createdByUserId: String(userIdParam).trim() },
          { deletedByUserId: String(userIdParam).trim() },
        ];
      }
      // else: super-admin sees everything — no filter
    } else {
      // Tenant admin: ONLY their own records — strict isolation
      filter.$or = [
        { assignedToUserId: viewerUserId },
        { createdByUserId: viewerUserId },
        { deletedByUserId: viewerUserId },
      ];
    }

    // Reason filter (from dropdown)
    const reasonParam = url.searchParams.get('reason');
    if (reasonParam && String(reasonParam).trim()) {
      filter.deletedReason = String(reasonParam).trim();
    }

    // Base filter for stat card counts
    const baseFilter: any = superAdmin && !userIdParam
      ? {}
      : superAdmin && userIdParam
        ? { $or: [{ assignedToUserId: String(userIdParam).trim() }, { createdByUserId: String(userIdParam).trim() }] }
        : { $or: [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }, { deletedByUserId: viewerUserId }] };

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
