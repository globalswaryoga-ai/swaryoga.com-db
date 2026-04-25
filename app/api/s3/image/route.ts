import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';


const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * GET /api/s3/image?key=path/to/file.jpg
 * Proxies S3 images through the server (for buckets without public access)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const bucket = searchParams.get('bucket') || 'swarygoal1hindi';

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Sanitize key - remove leading slash if present
    const sanitizedKey = key.startsWith('/') ? key.slice(1) : key;

    // Get the object from S3
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: sanitizedKey,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Convert the readable stream to an array buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Return the image with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.ContentType || 'image/jpeg',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error: any) {
    console.error('❌ S3 image proxy failed:', error);
    
    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to load image' },
      { status: 500 }
    );
  }
}
