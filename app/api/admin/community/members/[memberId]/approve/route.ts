import { connectDB } from '@/lib/db';
import { CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    await connectDB();

    const { memberId } = params;

    // Validate MongoDB ID format
    if (!memberId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: 'Invalid member ID format' },
        { status: 400 }
      );
    }

    // Find member
    const member = await CommunityMember.findById(memberId);

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check if member is already approved
    if (member.approved) {
      return NextResponse.json(
        { 
          success: true,
          data: member,
          message: 'Member is already approved'
        },
        { status: 200 }
      );
    }

    // Update member approval status
    member.approved = true;
    member.approvedAt = new Date();
    member.approvedBy = decoded.userId || decoded.username || 'admin';

    await member.save();

    return NextResponse.json(
      {
        success: true,
        data: member,
        message: `Member approved for messaging in ${member.communityName} community`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving member:', error);
    return NextResponse.json(
      { error: 'Failed to approve member' },
      { status: 500 }
    );
  }
}
