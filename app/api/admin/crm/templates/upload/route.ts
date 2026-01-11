/**
 * POST /api/admin/crm/templates/upload
 * File upload endpoint for template media (images, documents, videos)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  uploadTemplateFileToS3,
  validateTemplateFile,
} from '@/lib/aws-s3';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
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

    // 3. Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    if (!fileType || !['image', 'document', 'video'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid fileType: must be "image", "video" or "document"' },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { error: 'Missing templateId' },
        { status: 400 }
      );
    }

    // 4. Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';

    // 5. Validate file (size, type)
    const validation = validateTemplateFile(
      fileBuffer,
      mimeType,
      fileType as 'image' | 'document' | 'video'
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 6. Upload to S3
    const s3Url = await uploadTemplateFileToS3({
      file: fileBuffer,
      fileName: file.name,
      mimeType: mimeType,
      fileType: fileType as 'image' | 'document' | 'video',
      templateId: templateId,
    });

    if (!s3Url) {
      return NextResponse.json(
        { error: 'Upload to S3 failed' },
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
