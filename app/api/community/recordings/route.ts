import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getProtectedUrl } from '@/lib/bunny-storage';

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

        // Generate signed URL for S3 videos
        if (v.s3Key) {
          try {
            videoUrl = await getProtectedUrl(v.s3Key, 'community', 3600);
          } catch (err) {
            console.error(`[Recordings] Failed to sign URL for ${v._id}:`, err);
          }
        }

        // For YouTube recordings, use embed proxy
        if (v.videoSource === 'youtube' && v.youtubeVideoId) {
          videoUrl = `/api/community/videos/embed?v=${v._id}`;
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
