import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getProtectedUrl } from '@/lib/aws-s3';

export const dynamic = 'force-dynamic';


/**
 * GET /api/community/recordings
 * Public API to fetch community recordings
 * Returns public recordings and member-only recordings (with access flag)
 */
export async function GET(_request: NextRequest) {
  try {
    await connectDB();
    
    const { getCommunityVideo, getCommunity } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();
    const Community = getCommunity();

    // Get all communities with recordings
    const communities = await Community.find({
      isArchived: { $ne: true },
    }).select('_id name type').lean();

    // Get all videos (we'll filter by access on frontend)
    const videos = await CommunityVideo.find({})
      .sort({ recordedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    // Map community names to videos
    const communityMap = new Map(
      communities.map((c: any) => [c._id.toString(), c.name])
    );

    // Generate signed URLs for S3 videos
    const recordings = await Promise.all(
      videos.map(async (v: any) => {
        let videoUrl: string | null = null;

        // For Bunny Stream videos — extract libraryId+videoId for embed player
        let bunnyEmbedLibraryId: string | null = null;
        let bunnyEmbedVideoId: string | null = null;

        if (v.videoSource === 'bunny-stream') {
          // Priority 1: explicitly stored IDs from confirm/presigned upload
          if (v.bunnyLibraryId && v.bunnyVideoId) {
            bunnyEmbedLibraryId = v.bunnyLibraryId;
            bunnyEmbedVideoId = v.bunnyVideoId;
            videoUrl = `https://vz-${v.bunnyLibraryId}.b-cdn.net/${v.bunnyVideoId}/playlist.m3u8`;
          }
          // Priority 2: extract from s3Url CDN URL
          else {
            const srcUrl = v.s3Url || v.s3Key || '';
            const libMatch = srcUrl.match(/vz-([^.]+)\.b-cdn\.net/);
            const vidMatch = srcUrl.match(/\/([a-f0-9-]{36})/);
            if (libMatch && vidMatch) {
              bunnyEmbedLibraryId = libMatch[1];
              bunnyEmbedVideoId = vidMatch[1];
              videoUrl = `https://vz-${libMatch[1]}.b-cdn.net/${vidMatch[1]}/playlist.m3u8`;
            }
            // Priority 3: UUID-only s3Key — use env library ID
            else if (v.s3Key && /^[a-f0-9-]{36}$/.test(v.s3Key)) {
              const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
              if (libraryId) {
                bunnyEmbedLibraryId = libraryId;
                bunnyEmbedVideoId = v.s3Key;
                videoUrl = `https://vz-${libraryId}.b-cdn.net/${v.s3Key}/playlist.m3u8`;
              }
            }
          }
        }
        // For YouTube recordings, use embed proxy
        else if (v.videoSource === 'youtube' && v.youtubeVideoId) {
          videoUrl = `/api/community/videos/embed?v=${v._id}`;
        }
        // Generate signed URL for S3 videos
        else if (v.s3Key && !v.s3Key.includes('b-cdn.net')) {
          try {
            videoUrl = await getProtectedUrl(v.s3Key, 'community', 3600);
          } catch (err) {
            console.error(`[Recordings] Failed to sign URL for ${v._id}:`, err);
            if (v.s3Url) videoUrl = v.s3Url;
          }
        }

        // Build proxied thumbnail URL for Bunny Stream (CDN is token-protected)
        let thumbnailUrl = v.thumbnailUrl || null;
        if (bunnyEmbedLibraryId && bunnyEmbedVideoId) {
          thumbnailUrl = `/api/community/thumbnail?lib=${bunnyEmbedLibraryId}&vid=${bunnyEmbedVideoId}`;
        }

        return {
          _id: v._id.toString(),
          title: v.title || 'Untitled Recording',
          description: v.description,
          thumbnailUrl,
          videoUrl,
          videoSource: v.videoSource || 'aws',
          youtubeVideoId: v.youtubeVideoId,
          bunnyLibraryId: bunnyEmbedLibraryId,
          bunnyVideoId: bunnyEmbedVideoId,
          duration: v.duration,
          recordingType: v.recordingType,
          zoomMeetingId: v.zoomMeetingId,
          recordedAt: v.recordedAt,
          createdAt: v.createdAt,
          communityId: v.communityId?.toString(),
          communityName: v.communityId ? communityMap.get(v.communityId.toString()) : 'General',
          isPublic: v.isCommon || false,
          views: v.views || 0,
          likes: Array.isArray(v.likes) ? v.likes : [],
          comments: Array.isArray(v.comments) ? v.comments : [],
        };
      })
    );

    // Get recording counts per community
    const communitiesWithCounts = communities.map((c: any) => ({
      _id: c._id.toString(),
      name: c.name,
      type: c.type,
      recordingCount: videos.filter((v: any) => v.communityId?.toString() === c._id.toString()).length,
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
