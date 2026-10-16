import { NextRequest, NextResponse } from 'next/server';
import { saveCommunityMember, initCommunitySchema } from '@/lib/bunnyCommunityRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getOrCreateLeadIdForPhone } from '@/lib/crm/leadNumber';
import { generateToken } from '@/lib/auth';
import { notifyCommunityJoin } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const { name, email, mobile, countryCode, country, communityId, communityName } = await request.json();

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

    // Get or Create Lead ID from CRM system
    let leadUserId: string;
    try {
      leadUserId = await getOrCreateLeadIdForPhone(cleanMobile, name);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lead allocation failed' }, { status: 500 });
    }

    const member = await saveCommunityMember({
      userId: leadUserId,
      communityId,
      name: name.trim(),
      mobile: cleanMobile,
      email: email ? email.trim().toLowerCase() : undefined,
      countryCode: countryCode || '+91',
      country: country || '',
      status: 'active',
      role: 'member',
    });

    // Auto-join global community if different
    if (communityId !== 'global') {
      try {
        await saveCommunityMember({
          userId: leadUserId,
          communityId: 'global',
          name: name.trim(),
          mobile: cleanMobile,
          email: email ? email.trim().toLowerCase() : undefined,
          countryCode: countryCode || '+91',
          country: country || '',
          status: 'active',
          role: 'member',
        });
      } catch (e) {
        console.error('Auto-join Global failed:', e);
      }
    }

    const message = communityId === 'global'
      ? `✅ Welcome! You have successfully joined ${communityName || 'the community'}.`
      : `👋 Welcome! You have successfully joined ${communityName}.`;

    if (email) {
      notifyCommunityJoin(
        { name: name.trim(), email: email.trim().toLowerCase(), phone: cleanMobile },
        { communityName, approved: true, leadNumber: leadUserId },
      ).catch((err) => console.error('[CommunityJoin] Notification error:', err));
    }

    const token = generateToken({
      userId: member.userId || leadUserId,
      email: member.email || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message,
        data: {
          memberId: member.id,
          userId: member.userId || leadUserId,
          name: member.name,
          communityId: member.communityId,
          communityName,
          joinedAt: member.joinedAt,
          approved: member.approved,
          status: member.status,
          token,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Community join error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to join community' },
      { status: 500 }
    );
  }
}

// Get community members count
export async function GET(request: NextRequest) {
  try {
    await initCommunitySchema();

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId is required' },
        { status: 400 }
      );
    }

    const res = await bunnyExecute({
      sql: 'SELECT COUNT(*) as cnt FROM community_members_sql WHERE community_id = ? AND status = \'active\'',
      args: [communityId],
    });

    const memberCount = Number(res.rows[0]?.cnt || 0);

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
