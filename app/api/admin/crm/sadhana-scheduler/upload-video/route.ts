import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadAdminFile } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * POST /api/admin/crm/sadhana-scheduler/upload-video
 * Upload Sadhana video to Bunny CDN
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;
    const accessLevel = formData.get('accessLevel') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (fileType !== 'videos') {
      return NextResponse.json({ error: 'Only videos are accepted' }, { status: 400 });
    }

    if (accessLevel !== 'admin') {
      return NextResponse.json(
        { error: 'Sadhana videos must be uploaded as admin files' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${Math.round(
            MAX_VIDEO_SIZE / (1024 * 1024 * 1024)
          )}GB`,
        },
        { status: 400 }
      );
    }

    // Validate file type (MIME type)
    const allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid video format. Allowed: ${allowedMimeTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log(`[Sadhana Video Upload] Starting upload for ${file.name} (${file.size} bytes)`);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Bunny (admin access level)
    const url = await uploadAdminFile(buffer, file.name, 'videos');

    console.log(`[Sadhana Video Upload] ✅ Successfully uploaded to: ${url}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Sadhana Video Upload] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Video upload failed';

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
