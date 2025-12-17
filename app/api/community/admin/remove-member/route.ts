import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { Community } from '@/models/Community';
import mongoose from 'mongoose';

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

    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const updated = await Community.findByIdAndUpdate(
      communityId,
      { $pull: { members: userId } },
      { new: true, select: { members: 1, name: 1 } }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          communityId,
          name: (updated as any).name,
          membersCount: Array.isArray((updated as any).members) ? (updated as any).members.length : 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin remove member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
