import { NextRequest, NextResponse } from 'next/server';
import { uploadToBunnyStorage, getPublicFileUrl } from '@/lib/bunny-storage';
import { buildLifePlannerPath } from '@/lib/lifePlannerImageUpload';
import { getSession } from '@/lib/sessionManager';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const urlInput = formData.get('url') as string;

    // Get user ID from session
    const session = await getSession();
    const userId = session?.userId || session?.email || 'anonymous';

    // Handle URL input
    if (urlInput && !file) {
      // Validate URL
      try {
        new URL(urlInput);
        return NextResponse.json({ url: urlInput });
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    // Handle file upload
    if (!file) {
      return NextResponse.json(
        { error: 'No file or URL provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Build Bunny path
    const bunnyPath = buildLifePlannerPath(userId, file.name);

    // Upload to Bunny Storage
    const storageKey = await uploadToBunnyStorage(buffer, file.name, {
      customPath: bunnyPath,
    });

    // Get public URL
    const publicUrl = getPublicFileUrl(storageKey);

    return NextResponse.json({
      url: publicUrl,
      storageKey,
    });
  } catch (error) {
    console.error('Life Planner image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
