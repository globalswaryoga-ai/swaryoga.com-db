import { NextRequest, NextResponse } from 'next/server';


import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listBunnyCommunityMembers } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

// GET - Fetch community members (SUPERADMIN ONLY)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const status = searchParams.get('status') || 'active';
    const skip = parseInt(searchParams.get('skip') || '0');
    const limitParam = searchParams.get('limit');
    // No limit by default (0 = unlimited)
    const limit = limitParam ? parseInt(limitParam) : 0;

    const bunnyMembers = await listBunnyCommunityMembers({ communityId: communityId || undefined, status, skip, limit });
    const total = bunnyMembers.total;
    const membersWithDevices = bunnyMembers.members;

    return NextResponse.json(
      {
        success: true,
        data: {
          members: membersWithDevices,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching community members:', errorMsg);

    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from community
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Community member deletion is queued for the Bunny SQL mutation migration' },
      { status: 501 },
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error removing member:', errorMsg);

    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
