import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generatePresignedUrl, fetchFromStorage } from '@/lib/bunny-storage';

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

    // Parse URL to extract storage key
    // Support both old S3 format and new Bunny CDN format
    const s3UrlPattern = /https?:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/;
    const bunnyCdnPattern = /https?:\/\/[^/]*b-cdn\.net\/(.+)/;
    const s3Match = originalUrl.match(s3UrlPattern);
    const bunnyMatch = originalUrl.match(bunnyCdnPattern);

    let storageKey: string | null = null;

    if (s3Match) {
      storageKey = decodeURIComponent(s3Match[3]);
      console.log('[Media Proxy] Extracted key from S3 URL:', storageKey);
    } else if (bunnyMatch) {
      storageKey = decodeURIComponent(bunnyMatch[1]);
      console.log('[Media Proxy] Extracted key from Bunny CDN URL:', storageKey);
    }

    if (!storageKey) {
      // Unknown URL format, try to fetch directly
      console.log('[Media Proxy] Unknown URL format, fetching directly:', originalUrl);
      const response = await fetch(originalUrl);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: response.status });
      }
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Generate a CDN URL (with optional token auth)
    const signedUrl = await generatePresignedUrl(storageKey, {
      expiresIn: 3600 
    });

    // Fetch from CDN first, fall back to direct Storage API if CDN returns 403
    let response = await fetch(signedUrl);
    if (response.status === 403) {
      console.log('[Media Proxy] CDN returned 403, falling back to direct storage API');
      try {
        const { buffer: storageBuf, contentType: storageCT } = await fetchFromStorage(storageKey);
        return new NextResponse(new Uint8Array(storageBuf), {
          headers: {
            'Content-Type': storageCT,
            'Cache-Control': 'public, max-age=86400',
            'Content-Length': storageBuf.byteLength.toString(),
          },
        });
      } catch (storageErr: any) {
        console.error('[Media Proxy] Direct storage fetch also failed:', storageErr.message);
        return NextResponse.json({ error: 'Failed to fetch from storage' }, { status: 500 });
      }
    }
    if (!response.ok) {
      console.error('[Media Proxy] Storage fetch failed:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch from storage' }, { status: response.status });
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
