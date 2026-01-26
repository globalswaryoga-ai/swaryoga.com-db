import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generatePresignedUrl } from '@/lib/aws-s3';

/**
 * GET /api/admin/crm/media/proxy?url=<S3_URL>&token=<AUTH_TOKEN>
 * 
 * Proxies S3 media by:
 * 1. Generating a pre-signed URL for the S3 object
 * 2. Fetching the content server-side
 * 3. Streaming it back to the client
 * 
 * This bypasses S3's "Block Public Access" setting.
 * 
 * Note: Token can be passed as query param (for img src) or Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from header or query param (img src can't send headers)
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get the S3 URL from query params
    const originalUrl = searchParams.get('url');
    
    if (!originalUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Parse S3 URL to extract key
    // Expected format: https://<bucket>.s3.<region>.amazonaws.com/<key>
    const s3UrlPattern = /https?:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/;
    const match = originalUrl.match(s3UrlPattern);
    
    if (!match) {
      // If it's not an S3 URL, try to fetch directly
      console.log('[Media Proxy] Non-S3 URL, fetching directly:', originalUrl);
      const response = await fetch(originalUrl);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: response.status });
      }
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    }

    const [, bucket, , key] = match;
    const decodedKey = decodeURIComponent(key);

    console.log('[Media Proxy] Generating signed URL for:', { bucket, key: decodedKey });

    // Generate a pre-signed URL (valid for 1 hour)
    const signedUrl = await generatePresignedUrl(decodedKey, { 
      bucket,
      expiresIn: 3600 
    });

    // Fetch the content using the signed URL
    const response = await fetch(signedUrl);
    if (!response.ok) {
      console.error('[Media Proxy] S3 fetch failed:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch from S3' }, { status: response.status });
    }

    // Get content type from S3 response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    // Return the content with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Media Proxy Error]:', error);
    return NextResponse.json(
      { error: 'Failed to proxy media', details: error.message },
      { status: 500 }
    );
  }
}
