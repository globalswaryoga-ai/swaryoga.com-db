import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/communities/recordings-videos/confirm
 * Save Bunny Stream video metadata after successful upload
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      videoId,
      libraryId,
      title,
      description = '',
      communityId,
      tags = [],
      isCommon = false,
      folderName,
      playlistName,
      videoNumber,
      thumbnailUrl: customThumbnailUrl,
    } = body;

    console.log('[confirm] Request:', { videoId, libraryId, communityId, title });

    if (!videoId || !title || !communityId) {
      return NextResponse.json(
        { error: 'videoId, title, and communityId are required' },
        { status: 400 }
      );
    }

    if (!libraryId) {
      return NextResponse.json(
        { error: 'libraryId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Robust community lookup
    const { getCommunity, getCommunityVideo } = await import('@/lib/db');
    const Community = getCommunity();
    let community: any = null;

    if (mongoose.Types.ObjectId.isValid(communityId)) {
      community = await Community.findById(communityId);
    }
    if (!community) {
      community = await Community.findOne({
        $or: [
          { id: communityId },
          { name: communityId },
          { type: communityId },
          { name: { $regex: new RegExp(`^${communityId.replace(/-/g, '[\\s-]')}$`, 'i') } },
        ],
      });
    }

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Build stream URLs
    const streamUrl = `https://vz-${libraryId}.b-cdn.net/${videoId}/playlist.m3u8`;
    // Use custom thumbnail URL if provided, otherwise fall back to Bunny auto-generated
    const thumbnailUrl = customThumbnailUrl?.trim() || `https://vz-${libraryId}.b-cdn.net/${videoId}/thumbnail.jpg`;

    // Build tags array
    const tagArray = Array.isArray(tags) ? tags : [];
    if (folderName) tagArray.push(`folder:${folderName}`);
    if (playlistName) tagArray.push(`playlist:${playlistName}`);
    if (videoNumber) tagArray.push(`video:${videoNumber}`);

    const CommunityVideo = getCommunityVideo();
    const video = await CommunityVideo.create({
      communityId: communityId,
      title,
      description,
      s3Key: videoId,
      s3Url: streamUrl,
      thumbnailUrl,
      videoSource: 'bunny-stream',
      bunnyVideoId: videoId,
      bunnyLibraryId: libraryId,
      uploadedBy: decoded.email || decoded.userId || 'admin',
      isShareable: false,
      isCommon,
      source: 'manual',
      tags: tagArray,
      createdAt: new Date(),
    });

    console.log(`✅ [confirm] Video saved: ${videoId} for community ${community.name}`);

    return NextResponse.json({
      success: true,
      message: 'Video uploaded and saved successfully',
      content: {
        _id: video._id,
        title: video.title,
        communityId: video.communityId,
        communityName: community.name,
        streamUrl,
        thumbnailUrl,
      },
    });
  } catch (error: any) {
    console.error('❌ [confirm] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm video' },
      { status: 500 }
    );
  }
}
