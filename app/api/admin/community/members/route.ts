import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET - Fetch community members
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
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = { communityId };
    if (status !== 'all') {
      query.status = status;
    }

    const members = await CommunityMember.find(query)
      .sort({ joinedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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
