import { NextRequest, NextResponse } from 'next/server';
import { uploadToBunnyStorage, getPublicFileUrl } from '@/lib/bunny-storage';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base64, fileName, category = 'inbound' } = await req.json();

    if (!base64) {
      return NextResponse.json({ error: 'Base64 data is required' }, { status: 400 });
    }

    // Extract mime type and buffer
    const match = base64.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid base64 format' }, { status: 400 });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    const timestamp = Date.now();
    const cleanName = fileName ? fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '') : `media-${timestamp}`;
    const storageKey = `${category}/${timestamp}-${cleanName}`;

    // Upload to Bunny Storage
    const publicUrl = await uploadToBunnyStorage(buffer, cleanName, { contentType });

    return NextResponse.json({
      success: true,
      data: {
        key: storageKey,
        publicUrl,
        indirectUrl: `/api/media/bunny/${storageKey}`
      }
    });

  } catch (error) {
    console.error('Base64 Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload base64' }, 
      { status: 500 }
    );
  }
}
