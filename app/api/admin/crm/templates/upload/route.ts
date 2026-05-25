/**
 * POST /api/admin/crm/templates/upload
 * File upload endpoint for template media (images, documents, videos)
 * Uploads to Bunny CDN storage.
 * Supports both admin tokens (isAdmin+username) and tenant user tokens (userId+tenantId).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  uploadTemplateFileToS3,
  validateTemplateFile,
} from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    // Accept admin users (isAdmin) OR regular users (userId) OR any authenticated user
    const isAdmin = decoded?.isAdmin;
    const isUser = decoded?.userId;
    const isAnyAuth = decoded?.username || decoded?.isAdmin || decoded?.userId;

    if (!isAnyAuth) {
      console.error('[Template Upload] Auth failed:', JSON.stringify({ isAdmin: decoded?.isAdmin, hasUsername: !!decoded?.username, hasUserId: !!decoded?.userId }));
      return NextResponse.json(
        { error: 'Unauthorized: Login required' },
        { status: 401 }
      );
    }

    // Resolve folder identifier: admin uses username, tenant user uses tenantId or userId
    const folderOwner = decoded?.username || decoded?.tenantId || String(decoded?.userId || 'admin');

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string | null;
    const templateId = formData.get('templateId') as string | null;

    console.log('[Template Upload] Received:', {
      folderOwner,
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileMimeType: file?.type,
      fileType,
      templateId,
    });

    // 3. Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    if (!fileType || !['image', 'document', 'video'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid fileType: must be "image", "video" or "document"' },
        { status: 400 }
      );
    }

    // templateId is optional — generate one if not provided
    const resolvedTemplateId = templateId || `template_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 4. Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';

    console.log('[Template Upload] Buffer size:', fileBuffer.length, 'MIME:', mimeType);

    // 5. Validate file (size, type)
    const validation = validateTemplateFile(
      fileBuffer,
      mimeType,
      fileType as 'image' | 'document' | 'video'
    );

    if (!validation.valid) {
      console.error('[Template Upload] Validation failed:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 6. Upload to Bunny CDN
    let uploadedUrl: string;
    try {
      uploadedUrl = await uploadTemplateFileToS3({
        file: fileBuffer,
        fileName: file.name,
        mimeType: mimeType,
        fileType: fileType as 'image' | 'document' | 'video',
        templateId: resolvedTemplateId,
        tenantId: folderOwner,  // Used as folder path in Bunny
      });
    } catch (uploadError: any) {
      console.error('[Template Upload] Bunny upload error:', uploadError?.message);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!uploadedUrl) {
      return NextResponse.json({ error: 'Upload failed — no URL returned' }, { status: 500 });
    }

    console.log('[Template Upload] ✅ Uploaded to Bunny:', uploadedUrl);

    // 7. Return success
    return NextResponse.json({
      success: true,
      data: {
        url: uploadedUrl,
        fileName: file.name,
        mimeType: mimeType,
        sizeBytes: file.size,
      },
    });

  } catch (error: any) {
    console.error('[Template Upload] Unhandled error:', error);
    return NextResponse.json(
      { error: error?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
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
