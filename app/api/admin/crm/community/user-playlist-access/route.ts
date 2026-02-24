import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VideoPlaylist, UserPlaylistAccess, CommunityPlaylistAccess } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/community/user-playlist-access
 * Fetch playlists + user's current access for a given community
 * Query: ?communityId=swar-yoga-l1&userId=123456
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
    const userId = searchParams.get('userId');

    if (!communityId || !userId) {
      return NextResponse.json({ error: 'communityId and userId are required' }, { status: 400 });
    }

    // Fetch community-level access (which playlists are available for this community)
    const communityAccess = await CommunityPlaylistAccess.findOne({ communityId }).lean() as any;

    // Fetch all active playlists
    const allPlaylists = await VideoPlaylist.find({ status: { $ne: 'archived' } })
      .sort({ type: 1, sortOrder: 1, name: 1 })
      .select('_id name description type workshopSlug workshopName batchNumber year month videoCount status')
      .lean();

    // Filter to only playlists this community has access to
    let availablePlaylists;
    if (communityAccess?.allAccess) {
      availablePlaylists = allPlaylists;
    } else if (communityAccess?.playlistIds?.length > 0) {
      const accessIds = communityAccess.playlistIds.map((id: any) => id.toString());
      availablePlaylists = allPlaylists.filter((p: any) => accessIds.includes(p._id.toString()));
    } else {
      // Community has no playlist access configured — show all playlists
      availablePlaylists = allPlaylists;
    }

    // Fetch user-level access
    const userAccess = await UserPlaylistAccess.findOne({ userId, communityId }).lean() as any;

    return NextResponse.json({
      success: true,
      playlists: availablePlaylists.map((p: any) => ({
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
      })),
      userAccess: userAccess ? {
        allAccess: userAccess.allAccess || false,
        playlistIds: (userAccess.playlistIds || []).map((id: any) => id.toString()),
      } : null,
    });
  } catch (error: any) {
    console.error('[User Playlist Access GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch' }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/community/user-playlist-access
 * Save per-user playlist access
 * Body: { userId, communityId, userName?, mobile?, allAccess, playlistIds }
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

    const { userId, communityId, userName, mobile, allAccess, playlistIds } = await request.json();

    if (!userId || !communityId) {
      return NextResponse.json({ error: 'userId and communityId are required' }, { status: 400 });
    }

    const result = await UserPlaylistAccess.findOneAndUpdate(
      { userId, communityId },
      {
        userId,
        communityId,
        userName: userName || '',
        mobile: mobile || '',
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
        ? `${userName || userId} now has access to all playlists`
        : `${userName || userId} access updated (${(playlistIds || []).length} playlists)`,
      access: {
        userId: result.userId,
        communityId: result.communityId,
        allAccess: result.allAccess,
        playlistIds: result.playlistIds.map((id: any) => id.toString()),
      },
    });
  } catch (error: any) {
    console.error('[User Playlist Access POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save' }, { status: 500 });
  }
}
