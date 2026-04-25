/**
 * POST /api/admin/crm/templates/upload
 * File upload endpoint for template media (images, documents, videos)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {

  uploadTemplateFileToS3,
  validateTemplateFile,
} from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      console.error('[Template Upload] Auth failed - not admin');
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string | null;
    const templateId = formData.get('templateId') as string | null;

    console.log('[Template Upload] Received:', { 
      hasFile: !!file, 
      fileName: file?.name,
      fileSize: file?.size,
      fileMimeType: file?.type,
      fileType, 
      templateId 
    });

    // 3. Validate inputs
    if (!file) {
      console.error('[Template Upload] Missing file');
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    if (!fileType || !['image', 'document', 'video'].includes(fileType)) {
      console.error('[Template Upload] Invalid fileType:', fileType);
      return NextResponse.json(
        { error: 'Invalid fileType: must be "image", "video" or "document"' },
        { status: 400 }
      );
    }

    if (!templateId) {
      console.error('[Template Upload] Missing templateId');
      return NextResponse.json(
        { error: 'Missing templateId' },
        { status: 400 }
      );
    }

    // 4. Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';

    console.log('[Template Upload] File buffer size:', fileBuffer.length, 'MIME:', mimeType);

    // 5. Validate file (size, type)
    const validation = validateTemplateFile(
      fileBuffer,
      mimeType,
      fileType as 'image' | 'document' | 'video'
    );

    if (!validation.valid) {
      console.error('[Template Upload] Validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 6. Upload to S3
    let s3Url: string;
    try {
      s3Url = await uploadTemplateFileToS3({
        file: fileBuffer,
        fileName: file.name,
        mimeType: mimeType,
        fileType: fileType as 'image' | 'document' | 'video',
        templateId: templateId,
      });
    } catch (uploadError) {
      console.error('S3 upload error:', uploadError);
      return NextResponse.json(
        { error: `S3 Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!s3Url) {
      return NextResponse.json(
        { error: 'Upload to S3 failed - no URL returned' },
        { status: 500 }
      );
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      data: {
        url: s3Url,
        fileName: file.name,
        mimeType: mimeType,
        sizeBytes: file.size,
      },
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
