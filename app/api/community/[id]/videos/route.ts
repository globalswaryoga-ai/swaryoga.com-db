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

    // Optional authentication check
    const authHeader = request.headers.get('authorization');
    let decoded: any = null;
    let token = '';
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
      decoded = await verifyToken(token);
    }

    const isAdmin = decoded?.isAdmin === true;

    let videos = await listVideosRepo(communityId);
    // If specific community has no videos yet, fallback to global videos
    if (videos.length === 0 && communityId !== 'global') {
      const globalVideos = await listVideosRepo('global');
      if (globalVideos.length > 0) {
        videos = globalVideos;
      }
    }

    const videosWithUrls = await Promise.all(
      videos.map(async (video) => {
        try {
          const raw = video.rawDoc || {};
          let ytId = raw.youtubeVideoId;
          if (!ytId && video.s3Key?.startsWith('youtube:')) {
            ytId = video.s3Key.replace('youtube:', '').trim();
          }

          if (ytId) {
            return {
              _id: video.id,
              id: video.id,
              title: video.title,
              description: video.description || '',
              videoSource: 'youtube',
              embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
              thumbnailUrl: video.thumbnailUrl || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
              duration: video.duration,
              createdAt: video.createdAt,
              uploadedBy: video.uploadedBy,
              url: null,
              isShareable: true,
            };
          }

          if (video.s3Key && (isAdmin || token)) {
            const signedUrl = await getProtectedUrl(video.s3Key, 'community', 3600);
            return {
              _id: video.id,
              id: video.id,
              title: video.title,
              description: video.description || '',
              videoSource: raw.videoSource || 'aws',
              thumbnailUrl: video.thumbnailUrl,
              duration: video.duration,
              createdAt: video.createdAt,
              uploadedBy: video.uploadedBy,
              url: signedUrl,
              isShareable: Boolean(video.isShareable),
            };
          }

          return {
            ...video,
            _id: video.id,
            id: video.id,
            url: null,
            thumbnailUrl: video.thumbnailUrl || null,
          };
        } catch (err) {
          console.error(`Error processing video ${video.id}:`, err);
          return {
            ...video,
            _id: video.id,
            id: video.id,
            url: null,
          };
        }
      })
    );

    let finalVideos = videosWithUrls;

    // If no videos exist in database, provide foundational free community videos
    if (finalVideos.length === 0) {
      finalVideos = [
        {
          _id: 'free_video_swar_intro',
          id: 'free_video_swar_intro',
          title: 'Swar Yoga Complete Masterclass: Science of Shiva Swarodaya & Nostril Cycles',
          description: 'Learn the ancient Vedic science of breath cycles, Ida-Pingala nostril dominance, and how to master your health and destiny through breath control with Mohan Sir.',
          videoSource: 'youtube',
          embedUrl: 'https://www.youtube-nocookie.com/embed/luSaTlBXssM',
          thumbnailUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
          duration: 2700,
          createdAt: new Date().toISOString(),
          uploadedBy: 'Mohan Sir',
          url: null,
          isShareable: true,
        },
        {
          _id: 'free_video_chandra_healing',
          id: 'free_video_chandra_healing',
          title: 'Chandra Swar Healing: Cool Down Stress, Anxiety & Anger in 5 Minutes',
          description: 'Step-by-step practical demonstration on how to activate Chandra Nadi (left nostril) for instant relaxation, deeper sleep, and mental clarity.',
          videoSource: 'youtube',
          embedUrl: 'https://www.youtube-nocookie.com/embed/ZaHFiHVS1xg',
          thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
          duration: 1800,
          createdAt: new Date().toISOString(),
          uploadedBy: 'Mohan Sir',
          url: null,
          isShareable: true,
        },
        {
          _id: 'free_video_surya_activation',
          id: 'free_video_surya_activation',
          title: 'Surya Swar Activation: Vital Energy, Digestion & Confidence',
          description: 'How to switch to Surya Nadi (right nostril) before meals, workouts, and important meetings to activate metabolism and solar vitality.',
          videoSource: 'youtube',
          embedUrl: 'https://www.youtube-nocookie.com/embed/luSaTlBXssM',
          thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
          duration: 1500,
          createdAt: new Date().toISOString(),
          uploadedBy: 'Mohan Sir',
          url: null,
          isShareable: true,
        },
        {
          _id: 'free_video_morning_sadhana',
          id: 'free_video_morning_sadhana',
          title: 'Daily Morning Sadhana: 20-Min Breath Awareness Protocol',
          description: 'Start your morning with Mohan Sir: wake-up nostril check, stepping out of bed on the active swar, and 3-step pranic alignment.',
          videoSource: 'youtube',
          embedUrl: 'https://www.youtube-nocookie.com/embed/luSaTlBXssM',
          thumbnailUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
          duration: 1200,
          createdAt: new Date().toISOString(),
          uploadedBy: 'Mohan Sir',
          url: null,
          isShareable: true,
        }
      ];
    }

    return NextResponse.json({
      success: true,
      videos: finalVideos,
      total: finalVideos.length,
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
