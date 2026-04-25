import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VideoPlaylist, CommunityPlaylistAccess } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { verifyCommunityTenant, getAccessibleCommunityIds } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/community/recording-access
 * Fetch all playlists and the access mapping for all communities (or a specific community)
 * Query params: ?communityId=swar-yoga-l1 (optional)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    // Community-level tenant isolation
    if (communityId) {
      if (!(await verifyCommunityTenant(decoded, communityId))) {
        return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
      }
    }

    // Fetch all active playlists
    const playlists = await VideoPlaylist.find({ status: { $ne: 'archived' } })
      .sort({ type: 1, sortOrder: 1, name: 1 })
      .select('_id name description type workshopSlug workshopName batchNumber year month videoCount status sortOrder')
      .lean();

    // Fetch access mappings
    let accessMappings;
    if (communityId) {
      const mapping = await CommunityPlaylistAccess.findOne({ communityId }).lean();
      accessMappings = mapping ? [mapping] : [];
    } else {
      // Scope to accessible communities for non-superadmins
      const accessibleIds = await getAccessibleCommunityIds(decoded);
      const accessFilter = accessibleIds ? { communityId: { $in: accessibleIds } } : {};
      accessMappings = await CommunityPlaylistAccess.find(accessFilter).lean();
    }

    // Build a communityId → access map
    const accessMap: Record<string, { allAccess: boolean; playlistIds: string[] }> = {};
    for (const m of accessMappings as any[]) {
      accessMap[m.communityId] = {
        allAccess: m.allAccess || false,
        playlistIds: (m.playlistIds || []).map((id: any) => id.toString()),
      };
    }

    return NextResponse.json({
      success: true,
      playlists: playlists.map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        type: p.type,
        workshopSlug: p.workshopSlug,
        workshopName: p.workshopName,
        batchNumber: p.batchNumber,
        year: p.year,
        month: p.month,
        videoCount: p.videoCount || 0,
        status: p.status,
      })),
      accessMap,
    });
  } catch (error: any) {
    console.error('[Recording Access GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch recording access' }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/community/recording-access
 * Save the access mapping for a community
 * Body: { communityId: string, communityName?: string, allAccess: boolean, playlistIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    

    const { communityId, communityName, allAccess, playlistIds } = await request.json();

    if (!communityId || typeof communityId !== 'string') {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    // Community-level tenant isolation
    if (!(await verifyCommunityTenant(decoded, communityId))) {
      return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
    }

    // Upsert the access mapping
    const result = await CommunityPlaylistAccess.findOneAndUpdate(
      { communityId },
      {
        communityId,
        communityName: communityName || communityId,
        allAccess: !!allAccess,
        playlistIds: allAccess ? [] : (playlistIds || []),
        updatedBy: decoded.userId || decoded.username || 'admin',
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: allAccess
        ? `${communityName || communityId} now has access to all playlists`
        : `${communityName || communityId} access updated (${(playlistIds || []).length} playlists)`,
      access: {
        communityId: result.communityId,
        allAccess: result.allAccess,
        playlistIds: result.playlistIds.map((id: any) => id.toString()),
      },
    });
  } catch (error: any) {
    console.error('[Recording Access POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save recording access' }, { status: 500 });
  }
}
