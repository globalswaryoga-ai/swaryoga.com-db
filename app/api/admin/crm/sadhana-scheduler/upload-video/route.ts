import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadToBunnyStream } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * POST /api/admin/crm/sadhana-scheduler/upload-video
 * Upload Sadhana video directly to Bunny Stream (library 638748)
 * Returns direct CDN stream URL for Zoom Live Stream API
 */
export async function POST(request: NextRequest) {
  try {
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
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: 2GB`,
        },
        { status: 400 }
      );
    }

    // Validate video MIME type
    const allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid video format. Allowed: MP4, WebM, MOV, AVI`,
        },
        { status: 400 }
      );
    }

    console.log(`[Sadhana Video Upload] Starting upload for ${file.name} (${Math.round(file.size / 1024 / 1024)} MB)`);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload directly to Bunny Stream library 638748
    const streamUrl = await uploadToBunnyStream(
      buffer,
      file.name,
      file.name.split('.')[0] // Use filename without extension as title
    );

    console.log(`[Sadhana Video Upload] ✅ Success! Stream URL: ${streamUrl}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          url: streamUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          streamType: 'bunny-stream-direct',
          usage: 'Paste this URL into Sadhana Scheduler for automatic video playback in Zoom meetings',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Sadhana Video Upload] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Video upload failed';

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
