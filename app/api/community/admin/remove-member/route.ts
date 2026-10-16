import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { removeCommunityMember, getCommunity } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDefaultCommunities();

    const body = await request.json().catch(() => null);
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';

    if (!communityId || !userId) {
      return NextResponse.json({ error: 'communityId and userId are required' }, { status: 400 });
    }

    await removeCommunityMember(communityId, userId);
    const community = await getCommunity(communityId);

    return NextResponse.json(
      {
        success: true,
        data: {
          communityId,
          name: community?.name || communityId,
          membersCount: community?.membersCount || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin remove member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
