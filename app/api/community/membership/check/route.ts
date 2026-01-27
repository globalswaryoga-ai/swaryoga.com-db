import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMembership } from '@/lib/db';

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
      query.$or = [
        { mobile: normalizedMobile },
        { mobile: mobile },
        { 'metadata.mobile': normalizedMobile },
        { 'metadata.mobile': mobile }
      ];
    } else if (email) {
      query.$or = [
        { email: email.toLowerCase() },
        { 'metadata.email': email.toLowerCase() }
      ];
    }

    // Find all active memberships for this user
    const memberships = await CommunityMembership.find(query)
      .select('communityId status approved')
      .lean();

    // Extract community IDs where user is approved/active
    const memberCommunities = memberships
      .filter((m: any) => m.approved !== false) // Include if approved or approval not required
      .map((m: any) => m.communityId);

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
