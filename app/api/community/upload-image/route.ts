import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/aws-s3';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' }, { status: 400 });
    }

    // Validate file size (500MB max for high-quality images)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 500MB limit' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `community-posts/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Upload to S3
    const s3Url = await uploadToS3(fileBuffer, filename, {
      metadata: {
        'original-name': file.name,
        'uploaded-at': new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        url: s3Url,
        message: 'Image uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload image',
      },
      { status: 500 }
    );
  }
}
