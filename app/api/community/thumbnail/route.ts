import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/thumbnail?lib=606386&vid=uuid
 * Proxy Bunny Stream thumbnails — CDN is token-protected so browser can't fetch directly
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lib = searchParams.get('lib');
  const vid = searchParams.get('vid');

  if (!lib || !vid) {
    return new NextResponse('Missing lib or vid', { status: 400 });
  }

  const apiKey = process.env.BUNNY_API_KEY;
  if (!apiKey) {
    return new NextResponse('Not configured', { status: 500 });
  }

  // Fetch thumbnail from Bunny CDN using server-side API key
  const thumbnailUrl = `https://vz-${lib}.b-cdn.net/${vid}/thumbnail.jpg`;

  try {
    const res = await fetch(thumbnailUrl, {
      headers: { AccessKey: apiKey },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // Fallback: try fetching via Bunny Stream API for custom thumbnails
      const apiRes = await fetch(
        `https://video.bunnycdn.com/library/${lib}/videos/${vid}`,
        { headers: { AccessKey: apiKey, accept: 'application/json' } }
      );
      if (apiRes.ok) {
        const info = await apiRes.json();
        const customThumb = info.thumbnailFileName
          ? `https://vz-${lib}.b-cdn.net/${vid}/${info.thumbnailFileName}`
          : thumbnailUrl;

        const retry = await fetch(customThumb, { headers: { AccessKey: apiKey } });
        if (retry.ok) {
          const buf = await retry.arrayBuffer();
          return new NextResponse(buf, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      }
      return new NextResponse('Thumbnail not found', { status: 404 });
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch thumbnail', { status: 500 });
  }
}
