import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VideoPlaylist, PlaylistVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

// Generate a unique short code for video URLs (e.g. Xsde123)
function generateShortCode(length = 7): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// GET - List videos in a playlist
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlistId');
    const status = searchParams.get('status') || 'active';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'Playlist ID is required' }, { status: 400 });
    }

    // Get playlist info
    const playlist = await VideoPlaylist.findById(playlistId).lean();
    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
    }

    // Build query
    const query: any = { playlistId };
    if (status !== 'all') query.status = status;

    // Get videos
    const videos = await PlaylistVideo.find(query)
      .sort({ sortOrder: 1, sessionNumber: 1, uploadedAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await PlaylistVideo.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        playlist,
        videos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('[Videos API] Error fetching playlist videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Add a video to playlist
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      playlistId,
      title,
      description,
      videoUrl,
      s3Key,
      bunnyVideoId,
      bunnyEmbedUrl,
      thumbnailUrl,
      videoType,
      duration,
      quality,
      fileSize,
      mimeType,
      sessionNumber,
      sessionTitle,
      sortOrder,
      tags,
    } = body;

    if (!playlistId || !title || !videoUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Playlist ID, title, and video URL are required' 
      }, { status: 400 });
    }

    // Verify playlist exists
    const playlist = await VideoPlaylist.findById(playlistId);
    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const lastVideo = await PlaylistVideo.findOne({ playlistId })
        .sort({ sortOrder: -1 })
        .lean() as any;
      finalSortOrder = lastVideo ? ((lastVideo as any).sortOrder || 0) + 1 : 0;
    }

    // Generate unique short code
    let shortCode = generateShortCode();
    let codeExists = await PlaylistVideo.findOne({ shortCode }).lean();
    let attempts = 0;
    while (codeExists && attempts < 10) {
      shortCode = generateShortCode();
      codeExists = await PlaylistVideo.findOne({ shortCode }).lean();
      attempts++;
    }

    // Create video
    const video = await PlaylistVideo.create({
      playlistId,
      title,
      description: description || '',
      videoUrl,
      s3Key,
      bunnyVideoId: bunnyVideoId || undefined,
      bunnyEmbedUrl: bunnyEmbedUrl || undefined,
      thumbnailUrl,
      videoType: videoType || 'speaker',
      shortCode,
      duration: duration || 0,
      quality: quality || '720p',
      fileSize,
      mimeType: mimeType || 'video/mp4',
      sessionNumber,
      sessionTitle,
      sortOrder: finalSortOrder,
      tags: tags || [],
      status: 'active',
      uploadedBy: decoded.userId || decoded.email,
      uploadedAt: new Date(),
    });

    // Update playlist stats
    await VideoPlaylist.findByIdAndUpdate(playlistId, {
      $inc: { 
        videoCount: 1, 
        totalDuration: duration || 0 
      },
      $set: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: video,
      message: 'Video added to playlist successfully',
    });
  } catch (error: any) {
    console.error('[Videos API] Error adding video:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a video
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { videoId, ...updates } = body;

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Video ID is required' }, { status: 400 });
    }

    // Don't allow changing playlistId
    delete updates.playlistId;
    updates.updatedAt = new Date();

    const video = await PlaylistVideo.findByIdAndUpdate(
      videoId,
      { $set: updates },
      { new: true }
    );

    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: video,
      message: 'Video updated successfully',
    });
  } catch (error: any) {
    console.error('[Videos API] Error updating video:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a video from playlist
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Video ID is required' }, { status: 400 });
    }

    // Get video to update playlist stats
    const video = await PlaylistVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Archive the video (soft delete)
    await PlaylistVideo.findByIdAndUpdate(videoId, {
      $set: { status: 'archived', updatedAt: new Date() },
    });

    // Update playlist stats
    await VideoPlaylist.findByIdAndUpdate(video.playlistId, {
      $inc: { 
        videoCount: -1, 
        totalDuration: -(video.duration || 0) 
      },
      $set: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Video removed from playlist successfully',
    });
  } catch (error: any) {
    console.error('[Videos API] Error removing video:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
