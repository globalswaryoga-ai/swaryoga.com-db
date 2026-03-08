import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const BUNNY_API_BASE = 'https://video.bunnycdn.com';

/**
 * POST /api/admin/bunny/upload
 * Creates a Bunny Stream video placeholder and returns upload URL
 * Used for client-side direct uploads with progress tracking
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get request body
    const body = await req.json();
    const { filename, title } = body;

    if (!filename && !title) {
      return NextResponse.json({ error: 'Missing filename or title' }, { status: 400 });
    }

    // Validate Bunny config
    const apiKey = process.env.BUNNY_API_KEY;
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;

    if (!apiKey || !libraryId) {
      console.error('[Bunny Upload] Missing BUNNY_API_KEY or BUNNY_STREAM_LIBRARY_ID');
      return NextResponse.json(
        { error: 'Bunny Stream not configured. Contact admin.' },
        { status: 500 }
      );
    }

    // Create video placeholder in Bunny Stream
    const videoTitle = title || filename.replace(/\.[^/.]+$/, '');
    
    const createResponse = await fetch(
      `${BUNNY_API_BASE}/library/${libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: videoTitle }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Bunny Upload] Create video failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to create video in Bunny Stream' },
        { status: 500 }
      );
    }

    const videoData = await createResponse.json();
    const videoId = videoData.guid;

    // Return upload URL for direct client upload
    // The client will PUT the video file directly to Bunny's servers
    const uploadUrl = `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`;

    console.log(`[Bunny Upload] Created video placeholder: ${videoId}`);

    return NextResponse.json({
      success: true,
      videoId,
      libraryId,
      uploadUrl,
      // Also return the API key for direct upload (only in response, not logged)
      // Note: For production, consider using signed URLs instead
      accessKey: apiKey,
    });
  } catch (err: any) {
    console.error('[Bunny Upload] Error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
