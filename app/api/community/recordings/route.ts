import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getProtectedUrl } from '@/lib/aws-s3';

export const dynamic = 'force-dynamic';


/**
 * GET /api/community/recordings
 * Public API to fetch community recordings
 * Returns public recordings and member-only recordings (with access flag)
 */
export async function GET(request: NextRequest) {
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

        // For Bunny Stream videos, build HLS URL
        if (v.videoSource === 'bunny-stream') {
          if (v.s3Url && v.s3Url.includes('b-cdn.net')) {
            // Already a full CDN URL — use as-is, ensure it's HLS
            videoUrl = v.s3Url.includes('playlist.m3u8') ? v.s3Url
              : v.s3Url.replace(/\/?$/, '/playlist.m3u8');
          } else if (v.bunnyLibraryId && v.bunnyVideoId) {
            // Uploaded via presigned/confirm — rebuild from stored IDs
            videoUrl = `https://vz-${v.bunnyLibraryId}.b-cdn.net/${v.bunnyVideoId}/playlist.m3u8`;
          } else if (v.s3Key && v.s3Key.includes('b-cdn.net')) {
            // s3Key is a full Bunny URL
            const videoIdMatch = v.s3Key.match(/\/([a-f0-9-]{36})/);
            const libMatch = v.s3Key.match(/vz-([a-zA-Z0-9-]+)\./);
            if (videoIdMatch && libMatch) {
              videoUrl = `https://vz-${libMatch[1]}.b-cdn.net/${videoIdMatch[1]}/playlist.m3u8`;
            } else {
              videoUrl = v.s3Key;
            }
          } else if (v.s3Key && /^[a-f0-9-]{36}$/.test(v.s3Key)) {
            // s3Key is just a UUID videoId — use env library ID
            const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
            if (libraryId) {
              videoUrl = `https://vz-${libraryId}.b-cdn.net/${v.s3Key}/playlist.m3u8`;
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

        return {
          _id: v._id.toString(),
          title: v.title || 'Untitled Recording',
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          videoUrl,
          videoSource: v.videoSource || 'aws',
          youtubeVideoId: v.youtubeVideoId,
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
