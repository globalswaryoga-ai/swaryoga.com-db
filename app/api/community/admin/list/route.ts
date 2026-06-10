import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { Community } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDefaultCommunities();

    // Tenant isolation (SaaS): super admin sees ALL communities (existing data
    // preserved). Every other tenant sees only the communities they own plus the
    // shared/default ones (no owner) — never another tenant's owned community.
    // This matches getAccessibleCommunityIds() semantics used elsewhere.
    const decoded = verifyToken(request.headers.get('authorization')?.replace('Bearer ', '') || '');
    const viewerId = getViewerUserId(decoded);
    const filter = isSuperAdmin(decoded)
      ? {}
      : {
          $or: [
            { createdByUserId: viewerId },
            { createdByUserId: { $exists: false } },
            { createdByUserId: null },
            { createdByUserId: '' },
          ],
        };

    const communities = await Community.find(filter)
      .select({ name: 1, members: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: communities.map((c: any) => ({
          id: c._id?.toString(),
          name: c.name,
          members: Array.isArray(c.members) ? c.members : [],
          membersCount: Array.isArray(c.members) ? c.members.length : 0,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin community list error:', error);
    return NextResponse.json({ error: 'Failed to load communities' }, { status: 500 });
  }
}
