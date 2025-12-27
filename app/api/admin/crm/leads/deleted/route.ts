import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { DeletedLead } from '@/lib/schemas/enterpriseSchemas';

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
    if (!decoded?.isAdmin) {
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
        filter.assignedToUserId = String(userIdParam).trim();
      }
    } else {
      filter.assignedToUserId = viewerUserId;
    }

    if (q && String(q).trim()) {
      const query = String(q).trim();
      filter.$or = [
        { leadNumber: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }

    const deletedLeads = await DeletedLead.find(filter)
      .sort({ deletedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DeletedLead.countDocuments(filter);

    return NextResponse.json(
      { success: true, data: { deletedLeads, total, limit, skip } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load deleted leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
