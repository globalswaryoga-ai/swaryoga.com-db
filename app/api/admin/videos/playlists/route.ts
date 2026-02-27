import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VideoPlaylist, PlaylistVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET - List all playlists with filters
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
    const type = searchParams.get('type'); // 'batch' or 'post'
    const workshopSlug = searchParams.get('workshopSlug');
    const year = searchParams.get('year');
    const status = searchParams.get('status') || 'active';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query: any = {};
    if (type) query.type = type;
    if (workshopSlug) query.workshopSlug = workshopSlug;
    if (year) query.year = parseInt(year);
    if (status !== 'all') query.status = status;

    // Get playlists
    const playlists = await VideoPlaylist.find(query)
      .sort({ type: 1, sortOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await VideoPlaylist.countDocuments(query);

    // Get stats
    const stats = {
      totalBatchPlaylists: await VideoPlaylist.countDocuments({ type: 'batch', status: 'active' }),
      totalPostPlaylists: await VideoPlaylist.countDocuments({ type: 'post', status: 'active' }),
      totalVideos: await PlaylistVideo.countDocuments({ status: 'active' }),
    };

    return NextResponse.json({
      success: true,
      data: {
        playlists,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats,
      },
    });
  } catch (error: any) {
    console.error('[Videos API] Error fetching playlists:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a new playlist
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
      name,
      description,
      thumbnailUrl,
      type, // 'batch' or 'post'
      videoType, // 'gallery', 'speaker', or 'mixed'
      language, // 'hindi', 'english', or 'both'
      batchNumber,
      workshopSlug,
      workshopName,
      zoomMeetingId,
      zoomPassword,
      sessionPlan, // [{day:1,topic:"Intro"}, ...]
      year,
      month,
      communityId,
      isPublic,
      membersOnly,
      sortOrder,
    } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, error: 'Name and type are required' }, { status: 400 });
    }

    if (type === 'batch' && !batchNumber) {
      return NextResponse.json({ success: false, error: 'Batch number is required for batch playlists' }, { status: 400 });
    }

    if (type === 'post' && (!year || !month)) {
      return NextResponse.json({ success: false, error: 'Year and month are required for post playlists' }, { status: 400 });
    }

    // Check for duplicate (include videoType so speaker + gallery pairs don't clash)
    const existingQuery: any = { type, status: { $ne: 'archived' } };
    if (videoType) existingQuery.videoType = videoType;
    if (type === 'batch') {
      existingQuery.batchNumber = batchNumber;
      existingQuery.workshopSlug = workshopSlug || null;
    } else {
      existingQuery.year = year;
      existingQuery.month = month;
    }

    const existing = await VideoPlaylist.findOne(existingQuery);
    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: type === 'batch' 
          ? `Batch ${batchNumber} playlist already exists` 
          : `Playlist for ${month}/${year} already exists` 
      }, { status: 400 });
    }

    const playlist = await VideoPlaylist.create({
      name,
      description: description || '',
      thumbnailUrl,
      type,
      videoType: videoType || 'mixed',
      language: language || 'hindi',
      batchNumber: type === 'batch' ? batchNumber : undefined,
      workshopSlug: type === 'batch' ? workshopSlug : undefined,
      workshopName: type === 'batch' ? workshopName : undefined,
      zoomMeetingId: zoomMeetingId || undefined,
      zoomPassword: zoomPassword || undefined,
      sessionPlan: sessionPlan || [],
      year: type === 'post' ? year : undefined,
      month: type === 'post' ? month : undefined,
      communityId,
      isPublic: isPublic || false,
      membersOnly: membersOnly !== false, // default true
      sortOrder: sortOrder || 0,
      status: 'active',
      createdBy: decoded.userId || decoded.email,
    });

    return NextResponse.json({
      success: true,
      data: playlist,
      message: 'Playlist created successfully',
    });
  } catch (error: any) {
    console.error('[Videos API] Error creating playlist:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a playlist
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
    const { playlistId, ...updates } = body;

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'Playlist ID is required' }, { status: 400 });
    }

    // Don't allow changing type
    delete updates.type;
    updates.updatedAt = new Date();
    updates.updatedBy = decoded.userId || decoded.email;

    const playlist = await VideoPlaylist.findByIdAndUpdate(
      playlistId,
      { $set: updates },
      { new: true }
    );

    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: playlist,
      message: 'Playlist updated successfully',
    });
  } catch (error: any) {
    console.error('[Videos API] Error updating playlist:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Archive a playlist
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
    const playlistId = searchParams.get('playlistId');

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'Playlist ID is required' }, { status: 400 });
    }

    // Archive the playlist (soft delete)
    const playlist = await VideoPlaylist.findByIdAndUpdate(
      playlistId,
      { $set: { status: 'archived', updatedAt: new Date() } },
      { new: true }
    );

    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist archived successfully',
    });
  } catch (error: any) {
    console.error('[Videos API] Error archiving playlist:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
