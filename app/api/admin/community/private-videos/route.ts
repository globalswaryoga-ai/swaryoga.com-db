import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Schema for private community videos
const privateVideoSchema = new mongoose.Schema({
  videoTitle: { type: String, required: true },
  videoId: { type: String, required: true, unique: true },
  videoUrl: { type: String, required: true },
  ownerEmail: { type: String, required: true }, // Email that owns the video
  approvedEmails: [String], // Additional emails allowed to view
  createdAt: { type: Date, default: Date.now },
  createdBy: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  viewedBy: [
    {
      email: String,
      viewedAt: Date,
      duration: Number, // seconds watched
    },
  ],
});

/**
 * GET /api/admin/community/private-videos
 * Get private videos accessible to current user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId && !decoded?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get model or create if doesn't exist
    const PrivateVideo =
      mongoose.models.PrivateVideo || mongoose.model('PrivateVideo', privateVideoSchema);

    const userEmail = decoded.email || '';

    // Get videos where user's email is owner or approved
    const videos = await PrivateVideo.find({
      status: 'active',
      $or: [
        { ownerEmail: userEmail },
        { approvedEmails: userEmail },
      ],
    })
      .select('videoTitle videoId videoUrl ownerEmail createdAt')
      .lean();

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
    });
  } catch (error: any) {
    console.error('[Private Videos GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/community/private-videos
 * Admin adds a new private video (requires admin auth)
 * Body: { videoUrl, ownerEmail, videoTitle }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { videoUrl, ownerEmail, videoTitle, approvedEmails } = body;

    if (!videoUrl || !ownerEmail || !videoTitle) {
      return NextResponse.json(
        { error: 'Missing: videoUrl, ownerEmail, videoTitle' },
        { status: 400 }
      );
    }

    // Extract video ID from YouTube URL
    // Supports: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID
    let videoId = '';
    const urlObj = new URL(videoUrl);
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || '';
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.replace('/', '');
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    await connectDB();
    const PrivateVideo =
      mongoose.models.PrivateVideo || mongoose.model('PrivateVideo', privateVideoSchema);

    const video = await PrivateVideo.create({
      videoTitle,
      videoId,
      videoUrl,
      ownerEmail,
      approvedEmails: approvedEmails || [],
      createdBy: decoded.userId || 'admin',
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      data: video,
      message: `Video added for ${ownerEmail}`,
    });
  } catch (error: any) {
    console.error('[Private Videos POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/community/private-videos
 * Update approved emails for a video
 * Body: { videoId, approvedEmails }
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { videoId, approvedEmails } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId required' },
        { status: 400 }
      );
    }

    await connectDB();
    const PrivateVideo =
      mongoose.models.PrivateVideo || mongoose.model('PrivateVideo', privateVideoSchema);

    const video = await PrivateVideo.findOneAndUpdate(
      { videoId },
      { approvedEmails: approvedEmails || [] },
      { new: true }
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: video,
    });
  } catch (error: any) {
    console.error('[Private Videos PUT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
