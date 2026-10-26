export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { uploadToBunny } from '@/lib/bunny/bunnyUpload';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';

export const runtime = 'nodejs';

// Max video upload size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'avatar-studio/videos';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File is too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let publicUrl = '';
    let uploadError = '';

    // Primary: uploadToBunny
    try {
      const uploadRes = await uploadToBunny(buffer, file.name, folder);
      if (uploadRes.success && uploadRes.url) {
        publicUrl = uploadRes.url;
      } else {
        uploadError = uploadRes.error || '';
      }
    } catch (err: any) {
      uploadError = err.message || 'Primary upload error';
    }

    // Fallback: uploadToBunnyStorage
    if (!publicUrl) {
      try {
        publicUrl = await uploadToBunnyStorage(buffer, file.name);
      } catch (err: any) {
        uploadError = `${uploadError}; Storage fallback error: ${err.message || err}`;
      }
    }

    if (!publicUrl) {
      return NextResponse.json(
        { success: false, error: uploadError || 'Failed to upload to Bunny CDN' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
    });
  } catch (err: any) {
    console.error('[avatar-upload POST error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal upload error' },
      { status: 500 }
    );
  }
}
