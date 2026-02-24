import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getCommunityVideo, UserPlaylistAccess } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/community/user-playlist-access
 * Derives playlists from communityvideos tags (folder: / playlist:).
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

    // Fetch all community videos for this community
    const CommunityVideo = getCommunityVideo();
    const videos = await CommunityVideo.find({ communityId })
      .select('title tags createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Derive playlists from tags & title structure
    // Tags: ["folder:SWAR YOGA-FEB 2026-HINDI", "playlist:FEB-26 EVENING-(MONDAY) HINDI BATCH", "recording"]
    // Title: "FOLDER > PLAYLIST > Video N"
    const playlistMap: Record<string, { folder: string; playlist: string; videoCount: number }> = {};

    for (const video of videos as any[]) {
      let folder = '';
      let playlist = '';

      // Extract from tags first
      if (Array.isArray(video.tags)) {
        for (const tag of video.tags) {
          if (typeof tag === 'string') {
            if (tag.startsWith('folder:')) folder = tag.slice(7);
            if (tag.startsWith('playlist:')) playlist = tag.slice(9);
          }
        }
      }

      // Fallback: extract from title (FOLDER > PLAYLIST > Video N)
      if (!folder || !playlist) {
        const parts = (video.title || '').split(' > ');
        if (parts.length >= 2) {
          folder = folder || parts[0].trim();
          playlist = playlist || parts[1].trim();
        }
      }

      if (!folder || !playlist) continue;

      const key = `${folder}|||${playlist}`;
      if (!playlistMap[key]) {
        playlistMap[key] = { folder, playlist, videoCount: 0 };
      }
      playlistMap[key].videoCount++;
    }

    // Build playlists array — use "folder|||playlist" as ID for checkbox tracking
    const playlists = Object.entries(playlistMap).map(([key, data]) => ({
      _id: key,
      name: `${data.folder} > ${data.playlist}`,
      folder: data.folder,
      playlist: data.playlist,
      videoCount: data.videoCount,
    }));

    // Fetch user-level access
    const userAccess = await UserPlaylistAccess.findOne({ userId, communityId }).lean() as any;

    return NextResponse.json({
      success: true,
      playlists,
      userAccess: userAccess ? {
        allAccess: userAccess.allAccess || false,
        playlistIds: userAccess.playlistIds || [],
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
