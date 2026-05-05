import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Schema for private community videos
// All videos owned by swarsakshi9@gmail.com (single owner)
// Access control via community membership (not per-email)
const privateVideoSchema = new mongoose.Schema({
  videoTitle: { type: String, required: true },
  videoId: { type: String, required: true, unique: true },
  videoUrl: { type: String, required: true },
  ownerEmail: { type: String, default: 'swarsakshi9@gmail.com' }, // YouTube video owner
  requiredRole: {
    type: String,
    enum: ['member', 'participant', 'instructor', 'admin'],
    default: 'member' // Minimum role required to watch
  },
  videoType: { type: String, enum: ['class', 'workshop', 'tutorial', 'special'], default: 'class' },
  duration: Number, // in seconds
  description: String,
  thumbnail: String, // Custom thumbnail URL
  createdAt: { type: Date, default: Date.now },
  createdBy: String, // Admin who added it
  publishedAt: Date, // When made available
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  monetized: { type: Boolean, default: true }, // YouTube monetization enabled
  viewedBy: [
    {
      userId: String,
      email: String,
      viewedAt: Date,
      duration: Number, // seconds watched
    },
  ],
});

/**
 * GET /api/admin/community/private-videos
 * Get private videos accessible to current user
 * Videos are accessible if user is:
 * - Admin, OR
 * - Approved community member with required role
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

    // Check user role from decoded token
    // User must be at least 'member' role to access videos
    const userRole = decoded.role || 'member';
    const roleHierarchy: Record<string, number> = {
      member: 1,
      participant: 2,
      instructor: 3,
      admin: 4,
    };

    const userRoleLevel = roleHierarchy[userRole] || 1;

    // Get all active videos that user has access to
    const videos = await PrivateVideo.find({
      status: 'active',
      $expr: {
        $lte: [
          { $ifNull: [{ $get: 'requiredRole' }, 'member'] },
          userRole,
        ],
      },
    })
      .select('videoTitle videoId videoUrl videoType duration description thumbnail createdAt')
      .lean();

    // Filter by role level (user must meet minimum role requirement)
    const accessibleVideos = videos.filter(
      (v: any) => roleHierarchy[v.requiredRole || 'member'] <= userRoleLevel
    );

    return NextResponse.json({
      success: true,
      videos: accessibleVideos,
      count: accessibleVideos.length,
      userRole,
    });
  } catch (error: any) {
    console.error('[Private Videos GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/community/private-videos
 * Admin adds a new private video (requires admin auth)
 *
 * All videos owned by swarsakshi9@gmail.com (single owner account)
 * Access control via community role (member/participant/instructor/admin)
 *
 * Body: {
 *   videoUrl: "https://www.youtube.com/watch?v=...",
 *   videoTitle: "Video Title",
 *   description: "Video description",
 *   requiredRole: "member" (default) | "participant" | "instructor" | "admin",
 *   videoType: "class" | "workshop" | "tutorial" | "special"
 * }
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
    const { videoUrl, videoTitle, description, requiredRole = 'member', videoType = 'class' } = body;

    if (!videoUrl || !videoTitle) {
      return NextResponse.json(
        { error: 'Missing: videoUrl, videoTitle' },
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
      ownerEmail: 'swarsakshi9@gmail.com', // All videos owned by this account
      requiredRole, // Minimum role to watch
      videoType,
      description,
      createdBy: decoded.userId || 'admin',
      publishedAt: new Date(),
      status: 'active',
      monetized: true, // YouTube monetization enabled
    });

    return NextResponse.json({
      success: true,
      data: video,
      message: `✅ Video added! All videos owned by swarsakshi9@gmail.com`,
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
