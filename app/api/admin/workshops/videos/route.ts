import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listWorkshopVideos,
  saveWorkshopVideo,
  deleteWorkshopVideo,
} from '@/lib/bunnyWorkshopScheduleRepository';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = 'swarygoal1hindi';

/**
 * GET /api/admin/workshops/videos (SUPERADMIN ONLY)
 * List videos for a workshop/batch (BunnyDB)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const workshopId = searchParams.get('workshopId');
    const batchId = searchParams.get('batchId') || undefined;

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    const videos = await listWorkshopVideos(workshopId, batchId);

    return NextResponse.json({ success: true, videos });
  } catch (error: any) {
    console.error('[Videos API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops/videos (SUPERADMIN ONLY)
 * Add a new video to a workshop/batch (BunnyDB)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      workshopId,
      batchId,
      title,
      description,
      s3Key,
      bunnyVideoId,
      thumbnail,
      duration,
      dayNumber,
      accessType,
      recordedDate,
    } = body;

    if (!workshopId || !title || (!s3Key && !bunnyVideoId)) {
      return NextResponse.json(
        { error: 'Workshop ID, title, and S3 key or Bunny Video ID are required' },
        { status: 400 }
      );
    }

    const video = await saveWorkshopVideo({
      workshopId,
      batchId,
      title,
      description,
      s3Key,
      bunnyVideoId,
      thumbnail,
      duration,
      dayNumber,
      accessType,
      recordedDate,
    });

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('[Create Video Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workshops/videos (SUPERADMIN ONLY)
 * Update a video (BunnyDB)
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { videoId, ...updateData } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const video = await saveWorkshopVideo({ id: videoId, ...updateData });

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('[Update Video Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/workshops/videos (SUPERADMIN ONLY)
 * Delete a video (BunnyDB)
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    await deleteWorkshopVideo(videoId);

    return NextResponse.json({ success: true, message: 'Video deactivated' });
  } catch (error: any) {
    console.error('[Delete Video Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
