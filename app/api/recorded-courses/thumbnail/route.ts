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
  const rawUrl = searchParams.get('url');
  const vid = searchParams.get('vid') || searchParams.get('videoId');
  const fallback = searchParams.get('fallback');

  if (!rawUrl && !vid && !fallback) {
    return new NextResponse('Missing thumbnail url or video id', { status: 400 });
  }

  const urlsToTry: string[] = [];

  if (rawUrl) {
    urlsToTry.push(rawUrl);
  }

  if (vid) {
    const resolved = await resolveThumbnailUrl(vid);
    if (resolved) {
      urlsToTry.push(resolved);
    }
    urlsToTry.push(`https://${BUNNY_STREAM_HOST}/${vid}/thumbnail.jpg`);
  }

  if (fallback) {
    urlsToTry.push(fallback);
  }

  for (const cdnUrl of urlsToTry) {
    try {
      const res = await fetch(cdnUrl, {
        headers: {
          Referer: 'https://swaryoga.com',
          'User-Agent': 'Mozilla/5.0 (compatible; SwarYogaProxy/1.0)',
        },
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        });
      }
    } catch (err) {
      console.warn('[Thumbnail Proxy] Failed fetching:', cdnUrl, err);
    }
  }

  // Fallback to SVG placeholder if all else fails
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="none">
    <rect width="640" height="360" fill="#111827"/>
    <circle cx="320" cy="180" r="40" fill="#16A34A"/>
    <polygon points="312,165 336,180 312,195" fill="#FFFFFF"/>
    <text x="320" y="245" fill="#9CA3AF" font-family="sans-serif" font-size="14" text-anchor="middle">Swar Yoga</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
