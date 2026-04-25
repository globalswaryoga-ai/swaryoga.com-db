import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generatePresignedUrl } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';


/**
 * Get a signed URL for a template image
 * This solves the problem of private S3 buckets not being accessible directly
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const s3Key = searchParams.get('key');
    const s3Url = searchParams.get('url');

    if (!s3Key && !s3Url) {
      return NextResponse.json(
        { error: 'Missing: key or url parameter' },
        { status: 400 }
      );
    }

    // Extract key from S3 URL if provided
    let key = s3Key;
    if (!key && s3Url) {
      // Parse S3 URL: https://bucket.s3.region.amazonaws.com/key
      const urlObj = new URL(s3Url);
      key = decodeURIComponent(urlObj.pathname.slice(1)); // Remove leading /
    }

    if (!key) {
      return NextResponse.json(
        { error: 'Could not extract S3 key from URL' },
        { status: 400 }
      );
    }

    // Generate signed URL valid for 1 hour
    const signedUrl = await generatePresignedUrl(key, { expiresIn: 3600 });

    return NextResponse.json({ success: true, url: signedUrl }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate signed URL';
    console.error('[template-image-api]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
