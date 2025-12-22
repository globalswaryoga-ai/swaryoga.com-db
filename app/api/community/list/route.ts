import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { getUserIdFromRequest } from '@/lib/communityAuth';
import { Community } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const communities = await Community.find({ members: userId })
      .select({ name: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: communities.map((c: any) => ({
          id: c._id?.toString(),
          name: c.name,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Community list error:', error);
    return NextResponse.json({ error: 'Failed to load communities' }, { status: 500 });
  }
}
