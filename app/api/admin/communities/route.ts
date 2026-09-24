/**
 * Community API - Full CRUD for communities
 * 
 * GET - List communities (with type filter) - SUPERADMIN ONLY
 * POST - Create a new community OR Initialize system communities - SUPERADMIN ONLY
 * PUT - Update a community - SUPERADMIN ONLY
 * DELETE - Archive a community - SUPERADMIN ONLY
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { COMMUNITY_TYPES } from '@/lib/community-manager';
import { 
  listBunnyCommunities,
  listBunnyCommunityMembers,
  initializeSystemCommunities
} from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decoded.isAdmin && !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const query: Record<string, unknown> = {};
    
    if (type && Object.values(COMMUNITY_TYPES).includes(type as typeof COMMUNITY_TYPES[keyof typeof COMMUNITY_TYPES])) {
      query.type = type;
    }
    
    if (!includeArchived) {
      query.isArchived = false;
    }

    if (!decoded.isAdmin) {
      const membershipsResult = await listBunnyCommunityMembers({ status: 'active', limit: 10000 });
      const memberships = membershipsResult.members.filter((m: any) => m.userId === decoded.userId);
      const communityIds = memberships.map((m: any) => m.communityId);
      
      const allCommunities = await listBunnyCommunities({ type: COMMUNITY_TYPES.GLOBAL });
      const globalCommunity = allCommunities[0];
      
      const ids = [...communityIds];
      if (globalCommunity) ids.push(globalCommunity._id);
      
      query._id = { $in: ids };
    }

    const communities = await listBunnyCommunities(query);

    const enrichedCommunities = await Promise.all(
      communities.map(async (community: any) => {
        const result = await listBunnyCommunityMembers({
          communityId: community._id,
          status: 'active',
          limit: 10000
        });
        return { ...community, memberCount: result.total };
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
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    if (body.initializeSystem) {
      const { global, oldSadhak } = await initializeSystemCommunities();
      return NextResponse.json({
        success: true,
        message: 'System communities initialized',
        communities: {
          global: { id: global._id, name: global.name, type: global.type },
          oldSadhak: { id: oldSadhak._id, name: oldSadhak.name, type: oldSadhak.type },
        },
      });
    }

    const { name, description, type, isPublic, icon, color, joinLink, whatsappGroupId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Community name is required' }, { status: 400 });
    }

    const { getBunnyCommunityByName, createBunnyCommunity } = await import('@/lib/bunnyCommunityRepository');

    const existing = await getBunnyCommunityByName(name.trim());
    if (existing) {
      return NextResponse.json({ error: 'A community with this name already exists' }, { status: 400 });
    }

    const id = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const communityData = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      type: type || 'workshop_active',
      joinLink: joinLink?.trim() || '',
      whatsappGroupId: whatsappGroupId?.trim() || '',
      isArchived: false,
      members: [],
    };

    const community = await createBunnyCommunity(communityData);

    return NextResponse.json({
      success: true,
      message: 'Community created successfully',
      community: {
        ...community,
        memberCount: 0,
      },
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[Community Create] Error:', message, error);
    return NextResponse.json(
      { error: `Failed to create community: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { communityId, name, description, type, joinLink, whatsappGroupId } = body;

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
    }

    const { getBunnyCommunity, getBunnyCommunityByName, updateBunnyCommunity } = await import('@/lib/bunnyCommunityRepository');

    const community = await getBunnyCommunity(communityId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    if (name && name.trim() !== community.name) {
      const existing = await getBunnyCommunityByName(name.trim());
      if (existing && existing.id !== communityId) {
        return NextResponse.json({ error: 'A community with this name already exists' }, { status: 400 });
      }
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (type) updates.type = type;
    if (joinLink !== undefined) updates.joinLink = joinLink.trim();
    if (whatsappGroupId !== undefined) updates.whatsappGroupId = whatsappGroupId.trim();

    const updatedCommunity = await updateBunnyCommunity(communityId, updates);

    return NextResponse.json({
      success: true,
      message: 'Community updated successfully',
      community: updatedCommunity,
    });
  } catch (error) {
    console.error('Error updating community:', error);
    return NextResponse.json(
      { error: 'Failed to update community' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
    }

    const { getBunnyCommunity, updateBunnyCommunity } = await import('@/lib/bunnyCommunityRepository');

    const community = await getBunnyCommunity(communityId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    if (community.type === 'global') {
      return NextResponse.json({ error: 'Cannot delete the global community' }, { status: 400 });
    }

    await updateBunnyCommunity(communityId, {
      isArchived: true,
      archivedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Community archived successfully',
    });
  } catch (error) {
    console.error('Error archiving community:', error);
    return NextResponse.json(
      { error: 'Failed to archive community' },
      { status: 500 }
    );
  }
}
