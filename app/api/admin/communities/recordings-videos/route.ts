import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { 
  uploadCommunityVideo, 
  deleteFromS3,
  extractS3Key
} from '@/lib/aws-s3';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/communities/recordings-videos
 * Get all recordings and videos (admin only)
 */
export async function GET(request: NextRequest) {
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

    await connectDB();
    
    const { getCommunityVideo, getCommunity } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();
    const Community = getCommunity();

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const type = searchParams.get('type'); // 'recording' or 'video'

    // Build query
    const query: any = {};
    if (communityId) {
      query.communityId = communityId;
    }
    if (type === 'recording') {
      query.source = { $in: ['zoom', 'youtube_recording'] };
    } else if (type === 'video') {
      query.source = { $nin: ['zoom', 'youtube_recording'] };
    }

    // Get all videos/recordings
    const videos = await CommunityVideo.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Get all communities for the dropdown
    const communities = await Community.find({ isArchived: { $ne: true } })
      .select('_id name type')
      .lean();

    // Map community names
    const communityMap = new Map(
      communities.map((c: any) => [c._id.toString(), { name: c.name, type: c.type }])
    );

    const content = videos.map((v: any) => {
      const community = communityMap.get(v.communityId);
      return {
        _id: v._id.toString(),
        title: v.title || 'Untitled',
        description: v.description,
        communityId: v.communityId,
        communityName: community?.name || 'Unknown',
        communityType: community?.type || 'unknown',
        s3Key: v.s3Key,
        s3Url: v.s3Url,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        source: v.source || 'manual',
        videoSource: v.videoSource || 'aws',
        youtubeVideoId: v.youtubeVideoId,
        isCommon: v.isCommon || false,
        recordingType: v.recordingType,
        tags: v.tags || [],
        views: v.views || 0,
        createdAt: v.createdAt,
        recordedAt: v.recordedAt,
        uploadedBy: v.uploadedBy,
      };
    });

    return NextResponse.json({
      success: true,
      content,
      communities: communities.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        type: c.type,
      })),
      stats: {
        total: content.length,
        recordings: content.filter((c: any) => c.source === 'zoom').length,
        videos: content.filter((c: any) => c.source !== 'zoom').length,
      },
    });
  } catch (error: any) {
    console.error('❌ Get community recordings/videos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/communities/recordings-videos
 * Upload a new video or recording (admin only)
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

    const formData = await request.formData();
    // Accept both 'video' and 'file' field names
    const file = (formData.get('video') || formData.get('file')) as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const communityId = formData.get('communityId') as string;
    const isCommon = formData.get('isCommon') === 'true';
    const tags = formData.get('tags') as string || '';
    const contentType = formData.get('contentType') as string || 'video'; // 'video' or 'recording'
    
    // Recording folder/playlist metadata
    const folderName = formData.get('folderName') as string || '';
    const playlistName = formData.get('playlistName') as string || '';
    const videoNumber = formData.get('videoNumber') as string || '';
    const isRecording = formData.get('isRecording') === 'true';

    if (!file || !title || !communityId) {
      return NextResponse.json(
        { error: 'Video file, title, and community are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid video format. Allowed: MP4, WebM, MOV, AVI' },
        { status: 400 }
      );
    }

    // Max 2GB for videos (supports 2-hour recordings)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Video too large. Maximum size is 2GB' },
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

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Url = await uploadCommunityVideo(buffer, file.name, communityId);
    const s3Key = extractS3Key(s3Url);

    // Parse tags - include folder and playlist as tags for searchability
    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
    if (folderName) tagArray.push(`folder:${folderName}`);
    if (playlistName) tagArray.push(`playlist:${playlistName}`);

    // Determine source based on isRecording flag
    const source = isRecording ? 'manual' : (contentType === 'recording' ? 'zoom' : 'manual');

    // Save metadata to MongoDB
    const CommunityVideo = getCommunityVideo();
    const video = await CommunityVideo.create({
      communityId,
      title,
      description,
      s3Key,
      s3Url,
      uploadedBy: decoded.email || decoded.userId || 'admin',
      isShareable: false,
      isCommon,
      source,
      tags: tagArray,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Content uploaded successfully',
      content: {
        _id: video._id,
        title: video.title,
        communityId: video.communityId,
        communityName: community.name,
        folderName,
        playlistName,
        videoNumber,
      },
    });
  } catch (error: any) {
    console.error('❌ Upload community content error:', error);
    return NextResponse.json(
      { error: 'Failed to upload content' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/communities/recordings-videos
 * Update video/recording metadata (admin only)
 */
export async function PUT(request: NextRequest) {
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

    const { contentId, title, description, isCommon, tags, communityId } = await request.json();

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    await connectDB();
    
    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const updateData: any = { updatedAt: new Date() };
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isCommon !== undefined) updateData.isCommon = isCommon;
    if (tags) updateData.tags = tags;
    if (communityId) updateData.communityId = communityId;

    const content = await CommunityVideo.findByIdAndUpdate(
      contentId,
      updateData,
      { new: true }
    );

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Content updated successfully',
      content: {
        _id: content._id,
        title: content.title,
        communityId: content.communityId,
      },
    });
  } catch (error: any) {
    console.error('❌ Update community content error:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/communities/recordings-videos
 * Delete a video/recording (admin only)
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    await connectDB();
    
    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const video = await CommunityVideo.findById(contentId);
    
    if (!video) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Delete from S3 if key exists
    if (video.s3Key) {
      try {
        await deleteFromS3(video.s3Key);
      } catch (s3Error) {
        console.error('Warning: Could not delete from S3:', s3Error);
      }
    }

    // Delete from MongoDB
    await CommunityVideo.findByIdAndDelete(contentId);

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Delete community content error:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
