import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Just the video ID
 */
function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  
  // If it's already just a video ID (11 characters, alphanumeric + underscore/dash)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  
  try {
    const url = new URL(input);
    
    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId) return videoId;
      
      // youtube.com/embed/VIDEO_ID
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
    
    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1).split('?')[0];
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
    }
  } catch {
    // Not a valid URL, might be video ID
  }
  
  return null;
}

/**
 * GET /api/admin/communities/youtube-videos (SUPERADMIN ONLY)
 * List all YouTube videos for a community
 */
export async function GET(request: NextRequest) {
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
    // YouTube videos are main website data - superadmin only
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    await connectDB();

    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const query: any = { videoSource: 'youtube' };
    if (communityId) {
      query.communityId = communityId;
    }

    const videos = await CommunityVideo.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      videos: videos.map((v: any) => ({
        _id: v._id.toString(),
        title: v.title,
        description: v.description,
        communityId: v.communityId,
        youtubeVideoId: v.youtubeVideoId,
        thumbnailUrl: v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/maxresdefault.jpg`,
        duration: v.duration,
        views: v.views || 0,
        isCommon: v.isCommon,
        tags: v.tags || [],
        createdAt: v.createdAt,
      })),
      total: videos.length,
    });
  } catch (error: any) {
    console.error('❌ Get YouTube videos error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

/**
 * POST /api/admin/communities/youtube-videos (SUPERADMIN ONLY)
 * Add a YouTube video link to community
 * 
 * Body:
 * - communityId: string (required)
 * - youtubeUrl: string (required) - YouTube URL or video ID
 * - title: string (required)
 * - description: string (optional)
 * - isCommon: boolean (optional) - visible to all members
 * - tags: string[] (optional)
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
    // YouTube videos are main website data - superadmin only
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { communityId, youtubeUrl, title, description, isCommon, tags, duration, isRecording } = body;

    if (!communityId || !youtubeUrl || !title) {
      return NextResponse.json({ 
        error: 'communityId, youtubeUrl, and title are required' 
      }, { status: 400 });
    }

    // Extract video ID
    const youtubeVideoId = extractYouTubeId(youtubeUrl);
    if (!youtubeVideoId) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL or video ID' 
      }, { status: 400 });
    }

    await connectDB();

    const { getCommunityVideo, getCommunity } = await import('@/lib/db');
    const Community = getCommunity();
    const CommunityVideo = getCommunityVideo();

    // Verify community exists (communityId is a string slug like 'global', not an ObjectId)
    const community = await Community.findOne({ id: communityId });
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if exact same video + title already exists (allow same video ID with different titles)
    const existing = await CommunityVideo.findOne({
      communityId,
      youtubeVideoId,
      title,
    });
    if (existing) {
      return NextResponse.json({ 
        error: 'This exact video with same title is already added' 
      }, { status: 409 });
    }

    // Generate thumbnail URL from YouTube
    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;

    // Create video record
    // If isRecording is true, mark as recording so it shows in recordings tab
    const video = await CommunityVideo.create({
      communityId,
      title,
      description: description || '',
      videoSource: 'youtube',
      youtubeVideoId,
      youtubeUnlisted: true, // Assume unlisted for security
      thumbnailUrl,
      duration: duration || 0,
      uploadedBy: decoded.email || decoded.userId || 'admin',
      isShareable: false, // Never shareable
      isCommon: isCommon || false,
      source: isRecording ? 'youtube_recording' : 'youtube_import',
      tags: tags || [],
      views: 0,
      createdAt: new Date(),
    });

    console.log(`[YouTube Video] Added: ${title} (${youtubeVideoId}) to community ${communityId}`);

    return NextResponse.json({
      success: true,
      message: 'YouTube video added successfully',
      video: {
        _id: video._id.toString(),
        title: video.title,
        youtubeVideoId: video.youtubeVideoId,
        thumbnailUrl: video.thumbnailUrl,
        communityId: video.communityId,
        communityName: community.name,
      },
    });
  } catch (error: any) {
    console.error('❌ Add YouTube video error:', error);
    return NextResponse.json({ error: 'Failed to add video' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/communities/youtube-videos
 * Edit an existing YouTube video (title, description, URL, tags)
 */
export async function PUT(request: NextRequest) {
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
    const { videoId, youtubeUrl, title, description, tags } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    await connectDB();

    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const video = await CommunityVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;

    // If YouTube URL changed, update the video ID and thumbnail
    if (youtubeUrl) {
      const newYoutubeVideoId = extractYouTubeId(youtubeUrl);
      if (!newYoutubeVideoId) {
        return NextResponse.json({ error: 'Invalid YouTube URL or video ID' }, { status: 400 });
      }
      updates.youtubeVideoId = newYoutubeVideoId;
      updates.thumbnailUrl = `https://img.youtube.com/vi/${newYoutubeVideoId}/maxresdefault.jpg`;
    }

    const updated = await CommunityVideo.findByIdAndUpdate(videoId, { $set: updates }, { new: true });

    console.log(`[YouTube Video] Updated: ${updated.title} (${updated.youtubeVideoId})`);

    return NextResponse.json({
      success: true,
      message: 'Video updated successfully',
      video: {
        _id: updated._id.toString(),
        title: updated.title,
        description: updated.description,
        youtubeVideoId: updated.youtubeVideoId,
        thumbnailUrl: updated.thumbnailUrl,
        tags: updated.tags,
      },
    });
  } catch (error: any) {
    console.error('❌ Edit YouTube video error:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/communities/youtube-videos
 * Remove a YouTube video from community
 */
export async function DELETE(request: NextRequest) {
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

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    await connectDB();

    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const video = await CommunityVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.videoSource !== 'youtube') {
      return NextResponse.json({ 
        error: 'This is not a YouTube video. Use the recordings-videos endpoint.' 
      }, { status: 400 });
    }

    await CommunityVideo.findByIdAndDelete(videoId);

    console.log(`[YouTube Video] Deleted: ${video.title} (${video.youtubeVideoId})`);

    return NextResponse.json({
      success: true,
      message: 'YouTube video removed successfully',
    });
  } catch (error: any) {
    console.error('❌ Delete YouTube video error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
