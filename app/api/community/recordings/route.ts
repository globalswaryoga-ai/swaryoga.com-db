import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCommunitySchema } from '@/lib/bunnyCommunityRepository';
import { getProtectedUrl } from '@/lib/aws-s3';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/recordings
 * Public API to fetch community recordings
 */
export async function GET(request: NextRequest) {
  try {
    await initCommunitySchema();

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    const commRes = await bunnyExecute(
      'SELECT id, slug, name, type FROM communities_sql WHERE is_archived = 0 ORDER BY name ASC'
    );
    const communities = commRes.rows;

    let sql = 'SELECT * FROM community_videos_sql';
    const args: any[] = [];
    if (communityId) {
      sql += ' WHERE community_id = ?';
      args.push(communityId);
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';

    const vidRes = await bunnyExecute({ sql, args });
    const videos = vidRes.rows;

    const communityMap = new Map(
      communities.map((c: any) => [String(c.id || c.slug), String(c.name)])
    );

    const recordings = await Promise.all(
      videos.map(async (v: any) => {
        let raw: any = {};
        try {
          raw = JSON.parse(String(v.raw_doc_json || '{}'));
        } catch {
          raw = {};
        }

        let videoUrl: string | null = null;
        let bunnyEmbedLibraryId: string | null = null;
        let bunnyEmbedVideoId: string | null = v.bunny_video_id || null;

        if (raw.videoSource === 'bunny-stream' || raw.bunnyVideoId) {
          bunnyEmbedLibraryId = raw.bunnyLibraryId || process.env.BUNNY_STREAM_LIBRARY_ID || null;
          bunnyEmbedVideoId = raw.bunnyVideoId || v.bunny_video_id;
          if (bunnyEmbedLibraryId && bunnyEmbedVideoId) {
            videoUrl = `https://vz-${bunnyEmbedLibraryId}.b-cdn.net/${bunnyEmbedVideoId}/playlist.m3u8`;
          }
        } else if (raw.videoSource === 'youtube' && raw.youtubeVideoId) {
          videoUrl = `/api/community/videos/embed?v=${v.id}`;
        } else if (v.s3_key && !v.s3_key.includes('b-cdn.net') && !v.s3_key.startsWith('youtube:')) {
          try {
            videoUrl = await getProtectedUrl(v.s3_key, 'community', 3600);
          } catch (err) {
            console.error(`[Recordings] Failed to sign URL for ${v.id}:`, err);
          }
        }

        let thumbnailUrl = v.thumbnail_url || raw.thumbnailUrl || null;
        if (!thumbnailUrl && raw.youtubeVideoId) {
          thumbnailUrl = `https://img.youtube.com/vi/${raw.youtubeVideoId}/maxresdefault.jpg`;
        }

        return {
          _id: String(v.id),
          id: String(v.id),
          title: v.title || 'Untitled Recording',
          description: v.description || '',
          thumbnailUrl,
          videoUrl,
          videoSource: raw.videoSource || 'aws',
          youtubeVideoId: raw.youtubeVideoId,
          youtubeUrl: raw.youtubeUrl || (raw.youtubeVideoId ? `https://youtu.be/${raw.youtubeVideoId}` : undefined),
          bunnyLibraryId: bunnyEmbedLibraryId,
          bunnyVideoId: bunnyEmbedVideoId,
          duration: Number(v.duration || 0),
          createdAt: v.created_at,
          communityId: String(v.community_id),
          communityName: communityMap.get(String(v.community_id)) || 'General',
          isPublic: Boolean(v.is_shareable),
          views: Number(raw.views || 0),
          likes: Array.isArray(raw.likes) ? raw.likes : [],
          comments: Array.isArray(raw.comments) ? raw.comments : [],
        };
      })
    );

    const communitiesWithCounts = communities.map((c: any) => ({
      _id: String(c.id || c.slug),
      name: String(c.name),
      type: String(c.type || 'global'),
      recordingCount: videos.filter((v: any) => String(v.community_id) === String(c.id || c.slug)).length,
    }));

    return NextResponse.json({
      success: true,
      recordings,
      communities: communitiesWithCounts,
    });
  } catch (error) {
    console.error('[Community Recordings] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recordings',
    }, { status: 500 });
  }
}
