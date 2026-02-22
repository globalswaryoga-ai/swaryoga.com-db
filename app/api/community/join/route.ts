import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { getOrCreateLeadIdForPhone } from '@/lib/crm/leadNumber';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { generateToken } from '@/lib/auth';

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { name, email, mobile, countryCode, country, communityId, communityName, viaInviteLink } = await request.json();

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

    // NEW: Get or Create Lead ID from CRM system
    let leadUserId: string;
    try {
      leadUserId = await getOrCreateLeadIdForPhone(
        cleanMobile, 
        name, 
        email, 
        'website', 
        ['community']
      );
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lead allocation failed' }, { status: 500 });
    }

    // Optional warning: same name already exists in CRM (helps prevent accidental duplicates)
    // NOTE: This is a public endpoint, so we must NOT return other people's phone/email.
    let warning: any = null;
    try {
      const Lead = getLead();
      const cleanName = String(name || '').trim();
      if (cleanName) {
        const safe = escapeRegexLiteral(cleanName);
        const total = await Lead.countDocuments({ name: { $regex: `^\\s*${safe}\\s*$`, $options: 'i' } });
        if (total > 1) {
          warning = {
            code: 'NAME_DUPLICATE',
            message: 'Same name already exists. Please confirm mobile/email is correct before proceeding.',
            count: total,
          };
        }
      }
    } catch (e) {
      // Non-fatal warning only
      console.warn('Name-duplicate warning lookup failed:', e);
    }

    // Check if already a member by userId
    const existingByUserId = await CommunityMember.findOne({
      userId: leadUserId,
      communityId
    });

    if (existingByUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'This User ID is already registered in the community',
        },
        { status: 409 }
      );
    }

    // Check if already a member by mobile number
    // If they already joined with same mobile, update their info instead of blocking
    const existingMember = await CommunityMember.findOne({
      mobile: cleanMobile,
      communityId,
    });

    if (existingMember) {
      // Update existing member's info (allow them to "rejoin" after logout)
      existingMember.name = name.trim();
      existingMember.email = email ? email.trim().toLowerCase() : existingMember.email;
      existingMember.countryCode = countryCode || '+91';
      existingMember.country = country || existingMember.country || '';
      existingMember.status = 'active';
      // Keep their previous approval status
      
      await existingMember.save();

      const message = '👋 Welcome back! Messaging will be enabled after admin approval if not already done.';

      // Generate JWT token for the community user
      const token = generateToken({ 
        userId: existingMember.userId,
        email: existingMember.email || undefined,
      });

      return NextResponse.json(
        {
          success: true,
          message: message,
          ...(warning ? { warning } : {}),
          data: {
            memberId: existingMember._id,
            userId: existingMember.userId,
            name: existingMember.name,
            communityId: existingMember.communityId,
            communityName: existingMember.communityName,
            joinedAt: existingMember.joinedAt,
            approved: existingMember.approved,
            status: existingMember.status,
            token, // JWT token for like/comment
          },
          isUpdate: true,
        },
        { status: 200 }
      );
    }

    // Only Global community members are auto-approved.
    // All other communities (including invite-link joins) require admin approval.
    const newMember = new CommunityMember({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      mobile: cleanMobile,
      countryCode: countryCode || '+91',
      country: country || '',
      userId: leadUserId,
      communityId,
      communityName,
      status: 'active',
      approved: communityId === 'global', // Only Global is auto-approved; all others need admin approval
      joinedAt: new Date(),
    });

    await newMember.save();

    // AUTO-JOIN GLOBAL COMMUNITY
    // If they joined a specific group, also add them to 'global' if not already there
    if (communityId !== 'global') {
      try {
        const globalExists = await CommunityMember.findOne({
          mobile: cleanMobile,
          communityId: 'global',
        });

        if (!globalExists) {
          await CommunityMember.create({
            name: name.trim(),
            email: email ? email.trim().toLowerCase() : null,
            mobile: cleanMobile,
            countryCode: countryCode || '+91',
            userId: leadUserId,
            communityId: 'global',
            communityName: 'Global Community',
            status: 'active',
            approved: true,
            joinedAt: new Date(),
          });
          console.log(`✅ Auto-joined ${name} to Global Community`);
        }
      } catch (e) {
        console.error('❌ Auto-join Global failed:', e);
      }
    }

    const message = communityId === 'global'
      ? `✅ Welcome! You have successfully joined ${communityName || 'the community'}.`
      : '👋 Registration successful! Your request is pending admin approval. You will be notified once approved.';

    // Generate JWT token for the community user
    const token = generateToken({ 
      userId: newMember.userId,
      email: newMember.email || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message,
        ...(warning ? { warning } : {}),
        data: {
          memberId: newMember._id,
          userId: newMember.userId,
          name: newMember.name,
          communityName: newMember.communityName,
          joinedAt: newMember.joinedAt,
          approved: newMember.approved,
          token, // JWT token for like/comment
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
