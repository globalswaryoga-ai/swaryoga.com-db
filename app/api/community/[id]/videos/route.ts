import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  initCommunitySchema,
  listCommunityVideos as listVideosRepo,
  getCommunityVideo,
  saveCommunityVideo,
  deleteCommunityVideo,
} from '@/lib/bunnyCommunityRepository';
import {
  uploadCommunityVideo,
  getProtectedUrl,
  deleteFromS3,
  extractS3Key,
} from '@/lib/aws-s3';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/[id]/videos
 * Get all videos for a community (members only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initCommunitySchema();
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

    const isAdmin = decoded.isAdmin === true;

    // Check membership
    if (!isAdmin && communityId !== 'global') {
      const memberRes = await bunnyExecute({
        sql: `SELECT 1 FROM community_members_sql 
              WHERE (community_id = ? OR community_id = 'global') 
              AND user_id = ? AND status = 'active' LIMIT 1`,
        args: [communityId, String(decoded.userId)],
      });
      if (memberRes.rows.length === 0) {
        return NextResponse.json(
          { error: 'You must be a member of this community to view videos' },
          { status: 403 }
        );
      }
    }

    const videos = await listVideosRepo(communityId);

    const videosWithUrls = await Promise.all(
      videos.map(async (video) => {
        try {
          const raw = video.rawDoc || {};
          if (raw.videoSource === 'youtube' && raw.youtubeVideoId) {
            return {
              _id: video.id,
              title: video.title,
              description: video.description,
              videoSource: 'youtube',
              embedUrl: `/api/community/videos/embed?v=${video.id}&token=${token}`,
              thumbnailUrl: video.thumbnailUrl || `https://img.youtube.com/vi/${raw.youtubeVideoId}/maxresdefault.jpg`,
              duration: video.duration,
              createdAt: video.createdAt,
              uploadedBy: video.uploadedBy,
              url: null,
            };
          }

          if (video.s3Key) {
            const signedUrl = await getProtectedUrl(video.s3Key, 'community', 3600);
            return {
              _id: video.id,
              title: video.title,
              description: video.description,
              videoSource: raw.videoSource || 'aws',
              thumbnailUrl: video.thumbnailUrl,
              duration: video.duration,
              createdAt: video.createdAt,
              uploadedBy: video.uploadedBy,
              url: signedUrl,
            };
          }

          return {
            ...video,
            _id: video.id,
            url: null,
          };
        } catch (err) {
          console.error(`Error processing video ${video.id}:`, err);
          return {
            ...video,
            _id: video.id,
            url: null,
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
    await initCommunitySchema();
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
    const description = (formData.get('description') as string) || '';

    if (!file || !title) {
      return NextResponse.json(
        { error: 'Video file and title are required' },
        { status: 400 }
      );
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid video format. Allowed: MP4, WebM, MOV, AVI' },
        { status: 400 }
      );
    }

    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Video too large. Maximum size is 2GB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Url = await uploadCommunityVideo(buffer, file.name, communityId);
    const s3Key = extractS3Key(s3Url);

    const video = await saveCommunityVideo({
      communityId,
      title,
      description,
      s3Key,
      uploadedBy: decoded.userId || decoded.email || 'admin',
      isShareable: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Video uploaded successfully',
      video: {
        _id: video.id,
        id: video.id,
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
    await initCommunitySchema();

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

    const video = await getCommunityVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.s3Key) {
      await deleteFromS3(video.s3Key).catch(() => {});
    }

    await deleteCommunityVideo(videoId);

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
