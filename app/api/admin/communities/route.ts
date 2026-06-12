/**
 * Community API - Full CRUD for communities
 * 
 * GET - List communities (with type filter) - SUPERADMIN ONLY
 * POST - Create a new community OR Initialize system communities - SUPERADMIN ONLY
 * PUT - Update a community - SUPERADMIN ONLY
 * DELETE - Archive a community - SUPERADMIN ONLY
 */

import { NextRequest, NextResponse } from 'next/server';


import { connectDB, Community, CommunityMembership } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  initializeSystemCommunities, 
  COMMUNITY_TYPES 
} from '@/lib/community-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Communities management is main website data - superadmin only for admin access
    if (decoded.isAdmin && !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
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
      communities.map(async (community: any) => {
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
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Admins can create communities for their CRM workflows

    await connectDB();
    const body = await request.json();
    
    // Check if this is a request to initialize system communities
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

    // Create a new custom community
    const { name, description, type, isPublic, icon, color, joinLink, whatsappGroupId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Community name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await Community.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isArchived: false 
    });
    if (existing) {
      return NextResponse.json({ error: 'A community with this name already exists' }, { status: 400 });
    }

    // Generate a URL-friendly ID from the name
    const id = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const community = new Community({
      id,
      name: name.trim(),
      description: description?.trim() || '',
      type: type || 'workshop_active',
      joinLink: joinLink?.trim() || '',
      whatsappGroupId: whatsappGroupId?.trim() || '',
      // Custom fields for UI (stored in description JSON or separate fields)
      isArchived: false,
      members: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await community.save();

    return NextResponse.json({
      success: true,
      message: 'Community created successfully',
      community: {
        _id: community._id,
        id: community.id,
        name: community.name,
        description: community.description,
        type: community.type,
        memberCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating community:', error);
    return NextResponse.json(
      { error: 'Failed to create community' },
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
    // Admins can edit communities for their CRM workflows

    await connectDB();
    const body = await request.json();
    const { communityId, name, description, type, joinLink, whatsappGroupId } = body;

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== community.name) {
      const existing = await Community.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: communityId },
        isArchived: false 
      });
      if (existing) {
        return NextResponse.json({ error: 'A community with this name already exists' }, { status: 400 });
      }
    }

    // Update fields
    if (name) community.name = name.trim();
    if (description !== undefined) community.description = description.trim();
    if (type) community.type = type;
    if (joinLink !== undefined) community.joinLink = joinLink.trim();
    if (whatsappGroupId !== undefined) community.whatsappGroupId = whatsappGroupId.trim();
    community.updatedAt = new Date();

    await community.save();

    return NextResponse.json({
      success: true,
      message: 'Community updated successfully',
      community,
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
    // Admins can archive communities for their CRM workflows

    await connectDB();
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Don't allow deleting system communities
    if (community.type === 'global') {
      return NextResponse.json({ error: 'Cannot delete the global community' }, { status: 400 });
    }

    // Archive instead of delete (soft delete)
    community.isArchived = true;
    community.archivedAt = new Date();
    community.updatedAt = new Date();
    await community.save();

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
