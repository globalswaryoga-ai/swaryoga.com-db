import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BUNNY_STREAM_HOST = 'vz-d0769ece-079.b-cdn.net';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vid = searchParams.get('vid') || searchParams.get('videoId');

  if (!vid) {
    return new NextResponse('Missing video id', { status: 400 });
  }

  // Try fetching the thumbnail from Bunny CDN using the allowed referer
  const cdnUrl = `https://${BUNNY_STREAM_HOST}/${vid}/thumbnail.jpg`;

  try {
    const res = await fetch(cdnUrl, {
      headers: {
        Referer: 'https://swaryoga.com',
      },
      next: { revalidate: 86400 },
    });

    const resStatus = res.status;
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
        resStatus,
        resText: await res.text(),
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
