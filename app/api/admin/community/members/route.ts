import { NextRequest, NextResponse } from 'next/server';


import { connectDB, CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// GET - Fetch community members (SUPERADMIN ONLY)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const status = searchParams.get('status') || 'active';
    const skip = parseInt(searchParams.get('skip') || '0');
    const limitParam = searchParams.get('limit');
    // No limit by default (0 = unlimited)
    const limit = limitParam ? parseInt(limitParam) : 0;

    const query: any = { communityId };
    if (status === 'pending') {
      query.approved = false;
    } else if (status !== 'all') {
      query.status = status;
    }

    let membersQuery = CommunityMember.find(query)
      .sort({ joinedAt: -1 })
      .skip(skip);
    
    // Only apply limit if specified and > 0
    if (limit > 0) {
      membersQuery = membersQuery.limit(limit);
    }
    
    const members = await membersQuery.lean();

    const total = await CommunityMember.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: {
          members,
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const result = await CommunityMember.deleteOne({ _id: memberId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Member removed from community',
      },
      { status: 200 }
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
