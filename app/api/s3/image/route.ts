import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

function getS3Client(): S3Client | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
  });
}

function extractYouTubeId(url: string): string | null {
  try {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// 1x1 transparent PNG fallback buffer
const TRANSPARENT_1PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

/**
 * GET /api/s3/image?key=path/to/file.jpg
 * Unified image proxy that supports Bunny Storage, external URLs, YouTube thumbnails, and S3 fallback.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawKey = searchParams.get('key');
    const bucket = searchParams.get('bucket') || 'swarygoal1hindi';

    if (!rawKey) {
      return new NextResponse(TRANSPARENT_1PX_PNG, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    const key = decodeURIComponent(rawKey).trim();

    // 1. If key is a YouTube video URL, return YouTube thumbnail redirect
    const ytId = extractYouTubeId(key);
    if (ytId) {
      return NextResponse.redirect(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, { status: 302 });
    }

    // 2. If key is already an absolute HTTP/HTTPS URL, redirect directly
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return NextResponse.redirect(key, { status: 302 });
    }

    // Sanitize key - remove leading slashes
    const sanitizedKey = key.replace(/^\/+/, '');

    // 3. Check Bunny CDN first (Strict Bunny Storage priority)
    const cdnHost = process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net';
    const bunnyUrl = `https://${cdnHost}/${sanitizedKey}`;

    try {
      const bunnyRes = await fetch(bunnyUrl, { method: 'GET', cache: 'no-store' });
      if (bunnyRes.ok) {
        const contentType = bunnyRes.headers.get('content-type') || 'image/jpeg';
        const buffer = await bunnyRes.arrayBuffer();
        return new NextResponse(Buffer.from(buffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    } catch (bunnyErr) {
      // Continue to S3 fallback if Bunny CDN fetch fails
    }

    // 4. Fallback to AWS S3 if credentials exist
    const s3Client = getS3Client();
    if (s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: sanitizedKey,
        });

        const response = await s3Client.send(command);
        if (response.Body) {
          const chunks: Uint8Array[] = [];
          const reader = response.Body.transformToWebStream().getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const buffer = Buffer.concat(chunks);
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': response.ContentType || 'image/jpeg',
              'Content-Length': String(buffer.length),
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      } catch (s3Err) {
        // Fallback transparent PNG
      }
    }

    // 5. Safe fallback: return 1x1 transparent PNG with 200 OK so client doesn't get 500 error
    return new NextResponse(TRANSPARENT_1PX_PNG, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Safe image proxy fallback triggered:', error);
    return new NextResponse(TRANSPARENT_1PX_PNG, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
