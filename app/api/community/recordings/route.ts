import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

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

    const recordings = videos.map((v: any) => ({
      _id: v._id.toString(),
      title: v.title || 'Untitled Recording',
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      s3Url: v.s3Url,
      duration: v.duration,
      recordingType: v.recordingType,
      zoomMeetingId: v.zoomMeetingId,
      recordedAt: v.recordedAt,
      createdAt: v.createdAt,
      communityId: v.communityId?.toString(),
      communityName: v.communityId ? communityMap.get(v.communityId.toString()) : 'General',
      isPublic: v.isCommon || false, // Common videos are public
      viewCount: v.viewCount || 0,
    }));

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
