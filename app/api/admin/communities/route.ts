/**
 * Community API - Initialize system communities and manage community settings
 * 
 * GET - List communities (with type filter)
 * POST - Initialize system communities (Global + Old Sadhak)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Community, CommunityMembership } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { 
  initializeSystemCommunities, 
  COMMUNITY_TYPES 
} from '@/lib/community-manager';

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Build query
    const query: Record<string, unknown> = {};
    
    if (type && Object.values(COMMUNITY_TYPES).includes(type as typeof COMMUNITY_TYPES[keyof typeof COMMUNITY_TYPES])) {
      query.type = type;
    }
    
    if (!includeArchived) {
      query.isArchived = false;
    }

    // Admin can see all, regular users see only their communities
    if (!decoded.isAdmin) {
      const memberships = await CommunityMembership.find({
        userId: decoded.userId,
        status: 'active',
      });
      const communityIds = memberships.map(m => m.communityId);
      query._id = { $in: communityIds };
      
      // Also include global community
      const globalCommunity = await Community.findOne({ type: COMMUNITY_TYPES.GLOBAL });
      if (globalCommunity) {
        query._id = { $in: [...communityIds, globalCommunity._id] };
      }
    }

    const communities = await Community.find(query)
      .sort({ type: 1, createdAt: -1 })
      .lean();

    // Add member counts
    const enrichedCommunities = await Promise.all(
      communities.map(async (community) => {
        const memberCount = await CommunityMembership.countDocuments({
          communityId: community._id.toString(),
          status: 'active',
        });
        return { ...community, memberCount };
      })
    );

    return NextResponse.json({
      success: true,
      communities: enrichedCommunities,
    });
  } catch (error) {
    console.error('Error fetching communities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyToken(request);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Initialize system communities
    const { global, oldSadhak } = await initializeSystemCommunities();

    return NextResponse.json({
      success: true,
      message: 'System communities initialized',
      communities: {
        global: {
          id: global._id,
          name: global.name,
          type: global.type,
        },
        oldSadhak: {
          id: oldSadhak._id,
          name: oldSadhak.name,
          type: oldSadhak.type,
        },
      },
    });
  } catch (error) {
    console.error('Error initializing communities:', error);
    return NextResponse.json(
      { error: 'Failed to initialize communities' },
      { status: 500 }
    );
  }
}
