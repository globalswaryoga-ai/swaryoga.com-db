import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getPublicFileUrl } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/communities/recordings-videos/confirm
 * Confirm upload and save video metadata after file is uploaded to Bunny
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
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
    const { storagePath, title, description = '', communityId, tags = '', isCommon = false } = body;

    if (!storagePath || !title || !communityId) {
      return NextResponse.json(
        { error: 'storagePath, title, and communityId are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify community exists
    const { getCommunityVideo, getCommunity } = await import('@/lib/db');
    const Community = getCommunity();
    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Get public URL for the uploaded file
    const s3Url = getPublicFileUrl(storagePath);

    // Parse tags
    const tagArray = tags.split(',').map((t: string) => t.trim()).filter((t: string) => t);

    // Save metadata to MongoDB
    const CommunityVideo = getCommunityVideo();
    const video = await CommunityVideo.create({
      communityId,
      title,
      description,
      s3Key: storagePath,
      s3Url,
      uploadedBy: decoded.email || decoded.userId || 'admin',
      isShareable: false,
      isCommon,
      source: 'manual',
      tags: tagArray,
      createdAt: new Date(),
    });

    console.log(`✅ Video metadata saved for community ${communityId}: ${title}`);

    return NextResponse.json({
      success: true,
      message: 'Video confirmed and saved',
      content: {
        _id: video._id,
        title: video.title,
        communityId: video.communityId,
        communityName: community.name,
        s3Url,
        uploadedBy: video.uploadedBy,
        createdAt: video.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Confirm video upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm video' },
      { status: 500 }
    );
  }
}
