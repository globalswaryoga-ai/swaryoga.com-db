import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function signedCdnUrl(lib: string, path: string, cdnKey: string): string {
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = crypto
    .createHash('sha256')
    .update(cdnKey + path + expiry)
    .digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `https://vz-${lib}.b-cdn.net${path}?token=${token}&expires=${expiry}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lib = searchParams.get('lib');
  const vid = searchParams.get('vid');

  if (!lib || !vid) {
    return new NextResponse('Missing lib or vid', { status: 400 });
  }

  const apiKey = process.env.BUNNY_API_KEY;
  const cdnKey = process.env.BUNNY_STREAM_CDN_KEY;

  if (!apiKey) return new NextResponse('Not configured', { status: 500 });

  // Step 1: Get thumbnail filename from Bunny Stream API
  let thumbFile = 'thumbnail.jpg';
  try {
    const info = await fetch(
      `https://video.bunnycdn.com/library/${lib}/videos/${vid}`,
      { headers: { AccessKey: apiKey, accept: 'application/json' }, next: { revalidate: 300 } }
    );
    if (info.ok) {
      const data = await info.json();
      if (data.thumbnailFileName) thumbFile = data.thumbnailFileName;
    }
  } catch {}

  const cdnPath = `/${vid}/${thumbFile}`;

  // Step 2: Try signed URL first (if CDN key available), then plain URL
  const urls: string[] = [];
  if (cdnKey) urls.push(signedCdnUrl(lib, cdnPath, cdnKey));
  urls.push(`https://vz-${lib}.b-cdn.net${cdnPath}`);

  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return new NextResponse(buf, {
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch {}
  }

  return new NextResponse('Thumbnail not found', { status: 404 });
}
