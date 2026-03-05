import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/media/bunny/[...key]
 * 
 * Public proxy for Bunny Storage files.
 * Serves files directly from Bunny Storage API when the CDN Pull Zone is
 * suspended or not configured (returns 403).
 * 
 * No authentication required — these are public media files (images, videos).
 * Uses aggressive caching to minimize storage API calls.
 */

const REGION_HOSTS: Record<string, string> = {
  de: 'storage.bunnycdn.com',
  ny: 'ny.storage.bunnycdn.com',
  la: 'la.storage.bunnycdn.com',
  sg: 'sg.storage.bunnycdn.com',
  syd: 'syd.storage.bunnycdn.com',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    const keyParts = params.key;
    if (!keyParts || keyParts.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const storageKey = keyParts.join('/');
    const zoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    const apiKey = process.env.BUNNY_STORAGE_API_KEY;
    const region = process.env.BUNNY_STORAGE_REGION || 'de';
    const storageHost = REGION_HOSTS[region] || REGION_HOSTS.de;

    if (!zoneName || !apiKey) {
      return new NextResponse('Storage not configured', { status: 500 });
    }

    const url = `https://${storageHost}/${zoneName}/${storageKey}`;
    
    const response = await fetch(url, {
      headers: { AccessKey: apiKey },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new NextResponse('Not Found', { status: 404 });
      }
      return new NextResponse('Storage Error', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || guessContentType(storageKey);
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': buffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('[Bunny Media Proxy] Error:', error?.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function guessContentType(key: string): string {
  const ext = key.toLowerCase().split('.').pop();
  const types: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    pdf: 'application/pdf', mp3: 'audio/mpeg', ogg: 'audio/ogg',
  };
  return types[ext || ''] || 'application/octet-stream';
}
