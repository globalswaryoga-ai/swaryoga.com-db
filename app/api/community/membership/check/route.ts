import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/membership/check
 * Check which communities a user is a member of
 * 
 * Query params:
 * - mobile: User's mobile number
 * - email: User's email (alternative)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const mobile = searchParams.get('mobile');
    const email = searchParams.get('email');

    if (!mobile && !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Mobile or email required' 
      }, { status: 400 });
    }

    // Build query to find user memberships
    const query: any = { status: 'active' };
    
    if (mobile) {
      // Normalize mobile - remove non-digits and handle common formats
      const normalizedMobile = mobile.replace(/\D/g, '');
      // Also try with/without country prefix (91)
      const mobileVariants = [normalizedMobile, mobile];
      if (normalizedMobile.length === 12 && normalizedMobile.startsWith('91')) {
        mobileVariants.push(normalizedMobile.slice(2)); // 10-digit without 91
      } else if (normalizedMobile.length === 10) {
        mobileVariants.push('91' + normalizedMobile); // 12-digit with 91
      }
      query.mobile = { $in: [...new Set(mobileVariants)] };
    } else if (email) {
      query.email = email.toLowerCase();
    }

    // Find all active memberships for this user in CommunityMember collection
    // (this is the same collection the join API writes to)
    const memberships = await CommunityMember.find(query)
      .select('communityId status approved')
      .lean();

    // Extract community IDs where user is active
    const memberCommunities = memberships.map((m: any) => m.communityId);

    // Always include 'global' as everyone can access global community
    if (!memberCommunities.includes('global')) {
      memberCommunities.push('global');
    }

    return NextResponse.json({
      success: true,
      memberships: memberCommunities,
      total: memberCommunities.length
    });

  } catch (error: any) {
    console.error('[Membership Check] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check memberships',
      memberships: ['global'] // Default to global access
    }, { status: 500 });
  }
}
