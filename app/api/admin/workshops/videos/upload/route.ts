import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { saveWorkshopVideo } from '@/lib/bunnyWorkshopScheduleRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { generateUploadUrl } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/workshops/videos/upload
 * Get a presigned URL for uploading a workshop video to Bunny Storage
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
    const timestamp = Date.now();
    const slug = workshopSlug || 'workshop';
    const batch = batchNumber || 'general';
    const day = dayNumber || 1;
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    const s3Key = `workshops/${slug}/batch${batch}/day${day}/${timestamp}-${cleanFilename}`;

    // Generate upload URL for Bunny Storage
    const presignedUrl = await generateUploadUrl(s3Key, contentType);

    let videoRecord: any = null;
    if (title) {
      videoRecord = await saveWorkshopVideo({
        workshopId,
        batchId: batchId || undefined,
        title,
        description,
        s3Key,
        dayNumber: Number(dayNumber || 1),
        accessType: accessType || 'enrolled',
        recordedDate: recordedDate || new Date().toISOString().split('T')[0],
        isActive: false, // Will be activated after upload confirmation
      });
    }

    return NextResponse.json({
      success: true,
      uploadUrl: presignedUrl,
      s3Key,
      videoId: videoRecord?._id || videoRecord?.id,
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
 * Confirm upload completion and activate the video (BunnyDB)
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

    let where = 'id = ?';
    let arg = videoId;
    if (!videoId && s3Key) {
      where = 's3_key = ?';
      arg = s3Key;
    }

    const durationNum = duration ? Number(duration) : undefined;
    const updates = ['is_active = 1', 'updated_at = ?'];
    const args: any[] = [new Date().toISOString()];

    if (durationNum !== undefined) {
      updates.push('duration = ?');
      args.push(durationNum);
    }
    args.push(arg);

    await bunnyExecute({
      sql: `UPDATE workshop_videos_sql SET ${updates.join(', ')} WHERE ${where}`,
      args,
    });

    const res = await bunnyExecute({
      sql: `SELECT * FROM workshop_videos_sql WHERE ${where} LIMIT 1`,
      args: [arg],
    });

    return NextResponse.json({
      success: true,
      video: res.rows[0] ? { _id: res.rows[0].id, id: res.rows[0].id, ...res.rows[0] } : null,
      message: 'Video upload confirmed and activated',
    });
  } catch (error: any) {
    console.error('[Video Upload Confirm Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
