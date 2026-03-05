import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { 
  uploadCommunityVideo, 
  listCommunityVideos, 
  getProtectedUrl,
  deleteFromS3,
  extractS3Key
} from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

// Video metadata stored in MongoDB
interface CommunityVideo {
  _id?: string;
  communityId: string;
  title: string;
  description?: string;
  s3Key: string;
  duration?: number; // in seconds
  thumbnailUrl?: string;
  uploadedBy: string;
  createdAt: Date;
  isShareable: boolean; // Always false for community videos
}

/**
 * GET /api/community/[id]/videos
 * Get all videos for a community (members only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const communityId = params.id;
    
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Check if user is member of this community
    const { CommunityMembership } = await import('@/lib/db');
    const decodedAny = decoded as any;
    const membership = await CommunityMembership.findOne({
      communityId,
      $or: [
        { odId: decodedAny.odId },
        { odId: decoded.userId },
        { userId: decoded.userId }
      ],
      status: 'active'
    });

    // Allow admins to access all community videos
    const isAdmin = decoded.isAdmin === true;
    
    if (!membership && !isAdmin) {
      return NextResponse.json(
        { error: 'You must be a member of this community to view videos' },
        { status: 403 }
      );
    }

    // Get videos from MongoDB
    const { CommunityVideo: CommunityVideoModel } = await import('@/lib/db');
    const videos = await CommunityVideoModel.find({ communityId })
      .sort({ createdAt: -1 })
      .lean();

    // Process videos based on their source type
    const videosWithUrls = await Promise.all(
      videos.map(async (video: any) => {
        try {
          // For YouTube videos, return proxy embed URL (never expose youtubeVideoId)
          if (video.videoSource === 'youtube' && video.youtubeVideoId) {
            return {
              _id: video._id,
              title: video.title,
              description: video.description,
              videoSource: 'youtube',
              // DO NOT send youtubeVideoId — use proxy embed instead
              embedUrl: `/api/community/videos/embed?v=${video._id}&token=${token}`,
              thumbnailUrl: video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeVideoId}/maxresdefault.jpg`,
              duration: video.duration,
              views: video.views,
              createdAt: video.createdAt,
              isCommon: video.isCommon,
              tags: video.tags,
              uploadedBy: video.uploadedBy,
              url: null, // YouTube uses embed proxy instead
            };
          }
          
          // For AWS S3 videos, generate signed URL
          if (video.s3Key) {
            const signedUrl = await getProtectedUrl(video.s3Key, 'community', 3600);
            return {
              _id: video._id,
              title: video.title,
              description: video.description,
              videoSource: video.videoSource || 'aws',
              thumbnailUrl: video.thumbnailUrl,
              duration: video.duration,
              views: video.views,
              createdAt: video.createdAt,
              isCommon: video.isCommon,
              tags: video.tags,
              uploadedBy: video.uploadedBy,
              url: signedUrl,
            };
          }
          
          // Fallback
          return {
            ...video,
            url: null,
            error: 'Video source not configured',
          };
        } catch (error) {
          console.error(`Error processing video ${video._id}:`, error);
          return {
            ...video,
            url: null,
            error: 'Failed to process video',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      videos: videosWithUrls,
      total: videos.length,
    });
  } catch (error: any) {
    console.error('❌ Get community videos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/[id]/videos
 * Upload a new video (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const communityId = params.id;
    
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
    const file = formData.get('video') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';

    if (!file || !title) {
      return NextResponse.json(
        { error: 'Video file and title are required' },
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

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Url = await uploadCommunityVideo(buffer, file.name, communityId);
    const s3Key = extractS3Key(s3Url);

    // Save metadata to MongoDB
    const { CommunityVideo: CommunityVideoModel } = await import('@/lib/db');
    const video = await CommunityVideoModel.create({
      communityId,
      title,
      description,
      s3Key,
      uploadedBy: decoded.userId || decoded.email || 'admin',
      isShareable: false,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Video uploaded successfully',
      video: {
        _id: video._id,
        title: video.title,
        communityId: video.communityId,
      },
    });
  } catch (error: any) {
    console.error('❌ Upload community video error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/[id]/videos
 * Delete a video (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    await connectDB();

    const { CommunityVideo: CommunityVideoModel } = await import('@/lib/db');
    const video = await CommunityVideoModel.findById(videoId);
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete from S3
    await deleteFromS3(video.s3Key);

    // Delete from MongoDB
    await CommunityVideoModel.findByIdAndDelete(videoId);

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Delete community video error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
