import { NextRequest, NextResponse } from 'next/server';
import { checkUserMemberships } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/membership/check
 * Check which communities a user is a member of
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mobile = searchParams.get('mobile') || undefined;
    const email = searchParams.get('email') || undefined;

    if (!mobile && !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mobile or email required',
        },
        { status: 400 }
      );
    }

    const memberCommunities = await checkUserMemberships(mobile, email);

    return NextResponse.json({
      success: true,
      memberships: memberCommunities,
      total: memberCommunities.length,
    });
  } catch (error: any) {
    console.error('[Membership Check] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check memberships',
        memberships: ['global'],
      },
      { status: 500 }
    );
  }
}
