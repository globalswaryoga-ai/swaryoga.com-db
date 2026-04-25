import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/media/proxy?url=<MEDIA_URL>&token=<AUTH_TOKEN>
 * 
 * Universal media proxy that handles:
 * 1. Bunny CDN URLs (swaryogacrm.b-cdn.net) — fetch directly (public)
 * 2. Old Bunny CDN URLs (swaryogadb.b-cdn.net) — rewrite to new CDN host
 * 3. AWS S3 URLs (*.s3.*.amazonaws.com) — fetch directly (public bucket)
 * 4. Any other URL — fetch directly
 * 
 * This proxy ensures all media displays in the CRM regardless of storage backend.
 * Token can be passed as query param (for img src) or Authorization header.
 */

const NEW_CDN_HOST = process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net';
const OLD_CDN_HOST = 'swaryogadb.b-cdn.net';

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

    let originalUrl = searchParams.get('url');
    
    if (!originalUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Fix old suspended Bunny CDN URLs → rewrite to new CDN host
    if (originalUrl.includes(OLD_CDN_HOST)) {
      originalUrl = originalUrl.replace(OLD_CDN_HOST, NEW_CDN_HOST);
      console.log('[Media Proxy] Rewrote old Bunny CDN URL to:', originalUrl);
    }

    // Fetch the media directly — works for:
    // - Bunny CDN (public URLs)
    // - S3 (public bucket or content-addressed uploads)
    // - Any other accessible URL
    console.log('[Media Proxy] Fetching:', originalUrl.substring(0, 80));
    const response = await fetch(originalUrl, {
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      console.error('[Media Proxy] Fetch failed:', response.status, response.statusText, originalUrl.substring(0, 80));
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
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
