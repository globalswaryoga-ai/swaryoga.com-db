import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { Community } from '@/models/Community';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDefaultCommunities();

    const communities = await Community.find({})
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
