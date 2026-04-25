import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/communities/recordings-videos/bunny-url
 * Save video using direct Bunny Stream video URL (no file upload)
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
      bunnyUrl,
      title,
      description = '',
      communityId,
      tags = [],
      isCommon = false,
      folderName,
      playlistName,
      videoNumber,
    } = body;

    console.log('[bunny-url] Request:', { bunnyUrl, communityId, title });

    if (!bunnyUrl || !title || !communityId) {
      return NextResponse.json(
        { error: 'bunnyUrl, title, and communityId are required' },
        { status: 400 }
      );
    }

    // Validate Bunny URL format - should be HLS or direct video URL
    if (!bunnyUrl.includes('b-cdn.net') && !bunnyUrl.includes('bunnycdn.com')) {
      return NextResponse.json(
        { error: 'Invalid Bunny URL. Must be a valid Bunny CDN URL' },
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

    // Build tags array
    const tagArray = Array.isArray(tags) ? tags : [];
    if (folderName) tagArray.push(`folder:${folderName}`);
    if (playlistName) tagArray.push(`playlist:${playlistName}`);
    if (videoNumber) tagArray.push(`video:${videoNumber}`);

    // Determine if it's HLS or direct URL
    const isHls = bunnyUrl.includes('playlist.m3u8');
    const streamUrl = isHls ? bunnyUrl : bunnyUrl;

    // Extract video ID from URL if possible for thumbnail
    let thumbnailUrl = '';
    const videoIdMatch = bunnyUrl.match(/\/([a-f0-9-]+)\//);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      thumbnailUrl = `https://vz-${bunnyUrl.split('vz-')[1]?.split('.')[0]}.b-cdn.net/${videoId}/thumbnail.jpg`;
    }

    const CommunityVideo = getCommunityVideo();
    const video = await CommunityVideo.create({
      communityId: community._id.toString(),
      title,
      description,
      s3Key: bunnyUrl,
      s3Url: streamUrl,
      thumbnailUrl,
      videoSource: 'bunny-stream',
      bunnyUrl,
      uploadedBy: decoded.email || decoded.userId || 'admin',
      isShareable: false,
      isCommon,
      source: 'manual',
      tags: tagArray,
      createdAt: new Date(),
    });

    console.log(`✅ [bunny-url] Video saved: ${bunnyUrl} for community ${community.name}`);

    return NextResponse.json({
      success: true,
      message: 'Bunny Stream video added successfully',
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
    console.error('❌ [bunny-url] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add Bunny Stream video' },
      { status: 500 }
    );
  }
}
