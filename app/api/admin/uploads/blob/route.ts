import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { verifyToken } from '@/lib/auth';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB (serverless-safe)

function isAllowedContentType(contentType: string | undefined) {
  if (!contentType) return false;
  return contentType.startsWith('image/') || contentType.startsWith('video/');
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing required field: file' }, { status: 400 });
    }

    if (!isAllowedContentType(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image/* or video/* file.' },
        { status: 415 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Max size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB. For larger videos, paste a video URL instead.`,
        },
        { status: 413 }
      );
    }

    const originalName = typeof file.name === 'string' && file.name.trim() ? file.name.trim() : 'upload';
    const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';

    const pathname = `social-media/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          url: blob.url,
          pathname: blob.pathname,
          contentType: file.type,
          size: file.size,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading to blob:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
