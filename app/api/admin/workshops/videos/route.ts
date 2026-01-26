import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import { getWorkshopVideo, getVideoAccessLog } from '@/lib/schemas/workshopSchemas';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = 'swarygoal1hindi';

/**
 * GET /api/admin/workshops/videos
 * List videos for a workshop/batch
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const WorkshopVideo = getWorkshopVideo();
    const VideoAccessLog = getVideoAccessLog();

    const { searchParams } = new URL(req.url);
    const workshopId = searchParams.get('workshopId');
    const batchId = searchParams.get('batchId');
    const accessType = searchParams.get('accessType'); // 'free', 'enrolled', 'purchased'

    const query: any = {};
    if (workshopId) query.workshopId = new mongoose.Types.ObjectId(workshopId);
    if (batchId) query.batchId = new mongoose.Types.ObjectId(batchId);
    if (accessType) query.accessType = accessType;

    const videos = await WorkshopVideo.find(query)
      .sort({ dayNumber: 1, createdAt: -1 })
      .lean();

    // Get view counts for each video
    const enrichedVideos = await Promise.all(
      videos.map(async (video: any) => {
        const viewCount = await VideoAccessLog.countDocuments({ videoId: video._id });
        const uniqueViewers = await VideoAccessLog.distinct('userId', { videoId: video._id });
        return {
          ...video,
          viewCount,
          uniqueViewers: uniqueViewers.length,
        };
      })
    );

    return NextResponse.json({ success: true, videos: enrichedVideos });
  } catch (error: any) {
    console.error('[Videos API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops/videos
 * Add a new video to a workshop/batch
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const WorkshopVideo = getWorkshopVideo();

    const body = await req.json();
    const {
      workshopId,
      batchId,
      title,
      description,
      s3Key,
      thumbnail,
      duration,
      dayNumber,
      accessType,
      recordedDate,
    } = body;

    if (!workshopId || !title || !s3Key) {
      return NextResponse.json(
        { error: 'Workshop ID, title, and S3 key are required' },
        { status: 400 }
      );
    }

    const video = await WorkshopVideo.create({
      workshopId: new mongoose.Types.ObjectId(workshopId),
      batchId: batchId ? new mongoose.Types.ObjectId(batchId) : undefined,
      title,
      description,
      s3Key,
      thumbnail,
      duration,
      dayNumber: dayNumber || 1,
      accessType: accessType || 'enrolled',
      recordedDate: recordedDate ? new Date(recordedDate) : new Date(),
      isActive: true,
    });

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('[Create Video Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workshops/videos
 * Update a video
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const WorkshopVideo = getWorkshopVideo();

    const body = await req.json();
    const { videoId, ...updateData } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Convert IDs if provided
    if (updateData.workshopId) {
      updateData.workshopId = new mongoose.Types.ObjectId(updateData.workshopId);
    }
    if (updateData.batchId) {
      updateData.batchId = new mongoose.Types.ObjectId(updateData.batchId);
    }
    if (updateData.recordedDate) {
      updateData.recordedDate = new Date(updateData.recordedDate);
    }

    const video = await WorkshopVideo.findByIdAndUpdate(
      videoId,
      { $set: updateData },
      { new: true }
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('[Update Video Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/workshops/videos
 * Delete a video
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const WorkshopVideo = getWorkshopVideo();

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    const deleteS3 = searchParams.get('deleteS3') === 'true';

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const video = await WorkshopVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete from S3 if requested
    if (deleteS3 && video.s3Key) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: video.s3Key,
          })
        );
        console.log('[Video Delete] S3 file deleted:', video.s3Key);
      } catch (s3Error) {
        console.error('[Video Delete] S3 error:', s3Error);
        // Continue with DB deletion even if S3 fails
      }
    }

    // Soft delete
    await WorkshopVideo.findByIdAndUpdate(videoId, { isActive: false });

    return NextResponse.json({ success: true, message: 'Video deactivated' });
  } catch (error: any) {
    console.error('[Delete Video Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
