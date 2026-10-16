import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { listCommunities } from '@/lib/bunnyCommunityRepository';
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

    const decoded = verifyToken(request.headers.get('authorization')?.replace('Bearer ', '') || '');
    const viewerId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded);

    const communities = await listCommunities({
      isSuperAdmin: superAdmin,
      viewerId,
    });

    return NextResponse.json(
      {
        success: true,
        data: communities.map((c) => ({
          id: c.id,
          _id: c.id,
          name: c.name,
          slug: c.slug,
          members: [],
          membersCount: c.membersCount || 0,
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
