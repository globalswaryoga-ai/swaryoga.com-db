import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getWorkshopVideo } from '@/lib/schemas/workshopSchemas';
import { generateUploadUrl, getPublicFileUrl } from '@/lib/bunny-storage';
import mongoose from 'mongoose';

/**
 * POST /api/admin/workshops/videos/upload
 * Get a presigned URL for uploading a workshop video to S3
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      workshopId,
      batchId,
      workshopSlug,
      batchNumber,
      dayNumber,
      filename,
      contentType,
      title,
      description,
      accessType,
      recordedDate,
    } = body;

    if (!workshopId || !filename || !contentType) {
      return NextResponse.json(
        { error: 'Workshop ID, filename, and content type are required' },
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid video format. Allowed: MP4, MOV, AVI, WebM' },
        { status: 400 }
      );
    }

    // Generate Bunny storage key path
    const ext = filename.split('.').pop() || 'mp4';
    const timestamp = Date.now();
    const slug = workshopSlug || 'workshop';
    const batch = batchNumber || 'general';
    const day = dayNumber || 1;
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    const s3Key = `workshops/${slug}/batch${batch}/day${day}/${timestamp}-${cleanFilename}`;

    // Generate upload URL for Bunny Storage
    const presignedUrl = await generateUploadUrl(s3Key, contentType);

    // If title is provided, create the video record immediately
    // (will be marked as pending until upload completes)
    let videoRecord: any = null;
    if (title) {
      await connectDB();
      const WorkshopVideo = getWorkshopVideo();

      videoRecord = await WorkshopVideo.create({
        workshopId: new mongoose.Types.ObjectId(workshopId),
        batchId: batchId ? new mongoose.Types.ObjectId(batchId) : undefined,
        title,
        description,
        s3Key,
        dayNumber: dayNumber || 1,
        accessType: accessType || 'enrolled',
        recordedDate: recordedDate ? new Date(recordedDate) : new Date(),
        isActive: false, // Will be activated after upload confirmation
      });
    }

    return NextResponse.json({
      success: true,
      uploadUrl: presignedUrl,
      s3Key,
      videoId: videoRecord?._id,
      expiresIn: 3600,
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        note: 'Upload the file directly to the presigned URL using PUT method',
      },
    });
  } catch (error: any) {
    console.error('[Video Upload URL Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workshops/videos/upload
 * Confirm upload completion and activate the video
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { videoId, s3Key, duration } = body;

    if (!videoId && !s3Key) {
      return NextResponse.json(
        { error: 'Video ID or S3 key is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const WorkshopVideo = getWorkshopVideo();

    const query = videoId 
      ? { _id: new mongoose.Types.ObjectId(videoId) }
      : { s3Key };

    const video = await WorkshopVideo.findOneAndUpdate(
      query,
      { 
        $set: { 
          isActive: true,
          ...(duration && { duration }),
        } 
      },
      { new: true }
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      video,
      message: 'Video upload confirmed and activated',
    });
  } catch (error: any) {
    console.error('[Video Upload Confirm Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
