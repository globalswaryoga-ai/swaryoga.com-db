import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { name, email, mobile, communityId, communityName } = await request.json();

    // Validate inputs
    if (!name || !mobile || !communityId || !communityName) {
      return NextResponse.json(
        { error: 'Name, mobile, communityId, and communityName are required' },
        { status: 400 }
      );
    }

    // Validate email format (optional but recommended)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate mobile (basic check)
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return NextResponse.json(
        { error: 'Mobile number must be at least 10 digits' },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMember = await CommunityMember.findOne({
      mobile: cleanMobile,
      communityId,
    });

    if (existingMember) {
      return NextResponse.json(
        {
          success: false,
          error: 'You are already a member of this community',
          message: 'Welcome back! 👋',
        },
        { status: 409 }
      );
    }

    // Create new member
    // General community members need admin approval to send messages
    const isGeneralCommunity = communityId === 'general';
    
    const newMember = new CommunityMember({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      mobile: cleanMobile,
      communityId,
      communityName,
      status: 'active',
      approved: !isGeneralCommunity, // Enrolled communities auto-approve, general requires approval
      joinedAt: new Date(),
    });

    await newMember.save();

    const message = isGeneralCommunity
      ? '👋 Welcome! You can view posts. Messaging will be enabled after admin approval.'
      : '🎉 Welcome to the community!';

    return NextResponse.json(
      {
        success: true,
        message,
        data: {
          memberId: newMember._id,
          name: newMember.name,
          communityName: newMember.communityName,
          joinedAt: newMember.joinedAt,
          approved: newMember.approved,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Community join error:', errorMsg);

    // Handle duplicate key error
    if (errorMsg.includes('E11000')) {
      return NextResponse.json(
        {
          success: false,
          error: 'This mobile number is already registered in this community',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to join community' },
      { status: 500 }
    );
  }
}

// Get community members count
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId is required' },
        { status: 400 }
      );
    }

    const memberCount = await CommunityMember.countDocuments({
      communityId,
      status: 'active',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          communityId,
          memberCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Community member count error:', errorMsg);

    return NextResponse.json(
      { error: 'Failed to fetch member count' },
      { status: 500 }
    );
  }
}
