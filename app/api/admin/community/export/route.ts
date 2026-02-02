import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Export community members as CSV
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'
    const includeAll = searchParams.get('includeAll') === 'true';

    // Build query
    const query: any = { status: 'active' };
    if (communityId && communityId !== 'all') {
      query.communityId = communityId;
    }

    // Fetch members
    const members = await CommunityMember.find(query)
      .select('name email mobile countryCode communityId communityName userId joinedAt approved status')
      .sort({ joinedAt: -1 })
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = ['Name', 'Mobile', 'Email', 'Community', 'User ID', 'Status', 'Approved', 'Joined At'];
      const csvRows = members.map((m: any) => [
        `"${(m.name || '').replace(/"/g, '""')}"`,
        `"${(m.countryCode || '+91')}${m.mobile || ''}"`,
        `"${(m.email || '').replace(/"/g, '""')}"`,
        `"${(m.communityName || m.communityId || '').replace(/"/g, '""')}"`,
        `"${m.userId || ''}"`,
        `"${m.status || 'active'}"`,
        m.approved ? 'Yes' : 'No',
        m.joinedAt ? new Date(m.joinedAt).toISOString().split('T')[0] : '',
      ].join(','));

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="community-members-${communityId || 'all'}-${Date.now()}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      success: true,
      data: {
        members,
        count: members.length,
        communityId: communityId || 'all',
      },
    });
  } catch (error: any) {
    console.error('[Export Members API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Get phone numbers for bulk invite
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { communityId, targetCommunityId, action } = body;

    if (action === 'get-phones-not-in-community') {
      // Get phones from source community NOT in target community
      if (!communityId || !targetCommunityId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Both communityId and targetCommunityId are required' 
        }, { status: 400 });
      }

      // Get all members in source community
      const sourceMembers = await CommunityMember.find({ 
        communityId, 
        status: 'active' 
      }).select('mobile name').lean();

      // Get all phones in target community
      const targetPhones = await CommunityMember.find({ 
        communityId: targetCommunityId, 
        status: 'active' 
      }).distinct('mobile');

      const targetPhoneSet = new Set(targetPhones);

      // Filter: only those NOT in target
      const phonesNotInTarget = sourceMembers
        .filter((m: any) => !targetPhoneSet.has(m.mobile))
        .map((m: any) => ({
          mobile: m.mobile,
          name: m.name,
          fullPhone: `91${m.mobile.replace(/\D/g, '').slice(-10)}`,
        }));

      return NextResponse.json({
        success: true,
        data: {
          phones: phonesNotInTarget,
          count: phonesNotInTarget.length,
          sourceCommunity: communityId,
          targetCommunity: targetCommunityId,
        },
      });
    }

    // Default: get all phones from a community
    const query: any = { status: 'active' };
    if (communityId && communityId !== 'all') {
      query.communityId = communityId;
    }

    const members = await CommunityMember.find(query)
      .select('mobile name countryCode')
      .lean();

    const phones = members.map((m: any) => ({
      mobile: m.mobile,
      name: m.name,
      fullPhone: `${(m.countryCode || '91').replace('+', '')}${m.mobile.replace(/\D/g, '').slice(-10)}`,
    }));

    return NextResponse.json({
      success: true,
      data: {
        phones,
        count: phones.length,
        communityId: communityId || 'all',
      },
    });
  } catch (error: any) {
    console.error('[Export Members API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
