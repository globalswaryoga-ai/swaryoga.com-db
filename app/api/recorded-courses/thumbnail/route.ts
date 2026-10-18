import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BUNNY_STREAM_HOST = 'vz-d0769ece-079.b-cdn.net';
const thumbUrlCache = new Map<string, string>();

async function resolveThumbnailUrl(vid: string): Promise<string | null> {
  if (thumbUrlCache.has(vid)) {
    return thumbUrlCache.get(vid)!;
  }

  const libId = process.env.BUNNY_STREAM_LIBRARY_ID || '606386';
  const apiKey = process.env.BUNNY_API_KEY || '';

  if (apiKey) {
    try {
      const res = await fetch(`https://video.bunnycdn.com/library/${libId}/videos/${vid}`, {
        headers: { AccessKey: apiKey },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.thumbnailUrl || (data.thumbnailFileName ? `https://${BUNNY_STREAM_HOST}/${vid}/${data.thumbnailFileName}` : null);
        if (url) {
          thumbUrlCache.set(vid, url);
          return url;
        }
      }
    } catch (err) {
      console.warn('[Thumbnail Proxy] Error looking up video on Bunny Stream:', err);
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vid = searchParams.get('vid') || searchParams.get('videoId');

  if (!vid) {
    return new NextResponse('Missing video id', { status: 400 });
  }

  try {
    // 1. Resolve actual thumbnail URL from Bunny Stream metadata
    const cdnUrl = await resolveThumbnailUrl(vid) || `https://${BUNNY_STREAM_HOST}/${vid}/thumbnail.jpg`;

    // 2. Fetch the image using the allowed Referer header
    const res = await fetch(cdnUrl, {
      headers: {
        Referer: 'https://swaryoga.com',
      },
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': res.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        },
      });
    }

    if (searchParams.get('inspect') === '1') {
      return NextResponse.json({
        error: 'Thumbnail fetch failed',
        cdnUrl,
        resStatus: res.status,
      });
    }
  } catch (error: any) {
    console.error('[Thumbnail Proxy] Error fetching thumbnail:', error);
    if (searchParams.get('inspect') === '1') {
      return NextResponse.json({
        error: 'Exception thrown',
        message: error?.message,
      });
    }
  }

  return new NextResponse('Thumbnail not found', { status: 404 });
}
