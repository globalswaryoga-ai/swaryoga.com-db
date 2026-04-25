import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json().catch(() => null);
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const manualMember = body?.manualMember;

    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    let memberData: any = null;

    if (manualMember) {
      // Manual Entry Mode
      if (!manualMember.name || !manualMember.mobile) {
        return NextResponse.json({ error: 'Name and mobile are required for manual entry' }, { status: 400 });
      }

      // Check if already a member by mobile
      const existing = await CommunityMember.findOne({ communityId, mobile: manualMember.mobile });
      if (existing) {
        return NextResponse.json({ error: 'A member with this mobile number already exists in this community' }, { status: 400 });
      }

      memberData = {
        name: manualMember.name,
        mobile: manualMember.mobile,
        email: manualMember.email || `manual_${Date.now()}@temp.com`,
        userId: manualMember.userId || `M${Math.floor(100000 + Math.random() * 900000)}`,
        communityId,
        communityName: communityId, // Will be updated if we find a better name
        status: 'active',
        joinedAt: new Date(),
        approved: true,
        approvedAt: new Date(),
        approvedBy: decoded.username || 'admin',
      };
    } else if (userId) {
      // Search & Add Mode (from existing User table or profile ID)
      const user = (await User.findOne({ $or: [{ profileId: userId }, { email: userId }] }).lean()) as any;
      
      if (!user) {
        return NextResponse.json({ error: 'User not found in system' }, { status: 404 });
      }

      // Check if already a member
      const existing = await CommunityMember.findOne({ communityId, userId: user.profileId });
      if (existing) {
        return NextResponse.json({ error: 'User is already a member of this community' }, { status: 400 });
      }

      memberData = {
        name: user.name || 'Anonymous',
        mobile: user.phone || '',
        email: user.email,
        userId: user.profileId,
        communityId,
        communityName: communityId,
        status: 'active',
        joinedAt: new Date(),
        approved: true,
        approvedAt: new Date(),
        approvedBy: (decoded as any).username || 'admin',
      };
    } else {
      return NextResponse.json({ error: 'userId or manualMember is required' }, { status: 400 });
    }

    // Create the member
    const newMember = await CommunityMember.create(memberData);

    return NextResponse.json({
      success: true,
      message: 'Member added successfully',
      data: newMember
    });

  } catch (error) {
    console.error('Admin add member error:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
