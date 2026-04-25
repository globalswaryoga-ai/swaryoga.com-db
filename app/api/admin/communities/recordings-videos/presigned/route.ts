import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/communities/recordings-videos/presigned
 *
 * Creates a video in Bunny Stream and returns TUS upload credentials.
 * Bunny Stream handles large files natively via TUS protocol (resumable, chunked).
 * No server payload limits - uploads go directly to Bunny CDN.
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

    const body = await request.json();
    const { fileName, communityId, title } = body;

    console.log('[presigned] Request received:', { fileName, communityId, title });

    if (!fileName || !communityId || !title) {
      return NextResponse.json(
        { error: 'fileName, communityId, and title are required' },
        { status: 400 }
      );
    }

    // Validate file extension
    const validExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const ext = fileName.toLowerCase().split('.').pop();
    if (!validExtensions.includes(ext || '')) {
      return NextResponse.json(
        { error: 'Invalid video format. Allowed: MP4, WebM, MOV, AVI, MKV' },
        { status: 400 }
      );
    }

    await connectDB();

    // Robust community lookup: try by ObjectId, custom id, name, or type
    const { getCommunity } = await import('@/lib/db');
    const Community = getCommunity();
    let community: any = null;

    if (mongoose.Types.ObjectId.isValid(communityId)) {
      community = await Community.findById(communityId);
    }
    if (!community) {
      community = await Community.findOne({
        $or: [
          { id: communityId },
          { name: communityId },
          { type: communityId },
          { name: { $regex: new RegExp(`^${communityId.replace(/-/g, '[\\s-]')}$`, 'i') } },
        ],
      });
    }

    console.log('[presigned] Community lookup:', {
      communityId,
      found: !!community,
      foundId: community?._id?.toString(),
    });

    if (!community) {
      return NextResponse.json(
        { error: `Community not found for: ${communityId}` },
        { status: 404 }
      );
    }

    // Get Bunny Stream credentials
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      console.error('[presigned] Bunny Stream not configured:', {
        hasLibraryId: !!libraryId,
        hasApiKey: !!apiKey,
      });
      return NextResponse.json(
        { error: 'Bunny Stream not configured. Missing BUNNY_STREAM_LIBRARY_ID or BUNNY_API_KEY' },
        { status: 500 }
      );
    }

    // Step 1: Create video record in Bunny Stream
    console.log('[presigned] Creating video in Bunny Stream library:', libraryId);
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          AccessKey: apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error('[presigned] Bunny Stream create failed:', {
        status: createRes.status,
        body: errorText,
      });
      return NextResponse.json(
        { error: `Bunny Stream create failed: ${createRes.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;

    console.log('[presigned] Video created with GUID:', videoId);

    // Step 2: Generate TUS authentication signature
    // Signature = SHA256(libraryId + apiKey + expirationTime + videoId)
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const signatureString = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    const authSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

    return NextResponse.json({
      success: true,
      provider: 'bunny-stream',
      videoId,
      libraryId,
      authSignature,
      expirationTime,
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      streamUrl: `https://vz-${libraryId}.b-cdn.net/${videoId}/playlist.m3u8`,
      directUrl: `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      community: {
        id: community._id.toString(),
        name: community.name,
        slug: community.slug,
      },
      // For simple PUT upload (alternative to TUS)
      simpleUpload: {
        url: `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
        method: 'PUT',
        headers: {
          AccessKey: apiKey,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ [presigned] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL', stack: error.stack },
      { status: 500 }
    );
  }
}
