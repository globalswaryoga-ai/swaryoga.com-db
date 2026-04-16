import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadToBunnyStream } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large uploads

// Vercel limit is 250MB max request size, reduce to 200MB per upload for safety
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

/**
 * POST /api/admin/crm/sadhana-scheduler/upload-video
 * Upload Sadhana video directly to Bunny Stream (library 638748)
 * Returns direct CDN stream URL for Zoom Live Stream API
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Sadhana Video Upload] Request received');

    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Sadhana Video Upload] No auth header');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      console.error('[Sadhana Video Upload] Token verification failed');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('[Sadhana Video Upload] User authenticated:', decoded.userId);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[Sadhana Video Upload] No file in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Sadhana Video Upload] File received:', { name: file.name, size: file.size, type: file.type });

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      const msg = `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum: 200MB`;
      console.error('[Sadhana Video Upload]', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Validate video MIME type
    const allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      const msg = `Invalid format: ${file.type}. Allowed: MP4, WebM, MOV, AVI`;
      console.error('[Sadhana Video Upload]', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.log(`[Sadhana Video Upload] Starting upload for ${file.name} (${Math.round(file.size / 1024 / 1024)} MB)`);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[Sadhana Video Upload] Buffer created:', buffer.length, 'bytes');

    // Upload directly to Bunny Stream library 638748 into 'sadhana' collection
    let streamUrl: string;
    try {
      streamUrl = await uploadToBunnyStream(
        buffer,
        file.name,
        file.name.split('.')[0], // Use filename without extension as title
        'sadhana' // Collection/folder name
      );
      console.log(`[Sadhana Video Upload] ✅ Upload success! URL: ${streamUrl}`);
    } catch (bunnyError) {
      const errorMsg = bunnyError instanceof Error ? bunnyError.message : String(bunnyError);
      console.error('[Sadhana Video Upload] Bunny upload failed:', errorMsg);
      throw bunnyError;
    }

    const response = {
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
    };

    console.log('[Sadhana Video Upload] Sending response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Video upload failed';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('[Sadhana Video Upload] ❌ Error:', {
      message: errorMessage,
      stack: errorStack,
      fullError: String(error),
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
