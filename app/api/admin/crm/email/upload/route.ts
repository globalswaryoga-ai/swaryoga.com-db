/**
 * POST /api/admin/crm/email/upload
 * File upload endpoint for email attachments (images, documents, videos)
 * Uploads to S3 via the existing admin media upload utility
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadAdminFile } from '@/lib/aws-s3';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Max file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;    // 25MB (Resend limit ~40MB total)
const MAX_DOC_SIZE = 10 * 1024 * 1024;      // 10MB

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
};

function detectFileType(mimeType: string): 'image' | 'video' | 'document' | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  for (const mime of ALLOWED_MIME_TYPES.document) {
    if (mimeType === mime) return 'document';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const isSuperAdmin = decoded?.userId === 'admin' || 
                          decoded?.userId === 'admincrm' ||
                          (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));

    if (!isSuperAdmin && !hasPermission(decoded?.permissionsV2, 'email', 'send')) {
      return NextResponse.json({ error: 'Email send permission required' }, { status: 403 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const fileType = detectFileType(mimeType);

    if (!fileType) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${mimeType}. Allowed: images, videos, PDFs, documents` 
      }, { status: 400 });
    }

    // 3. Validate allowed MIME
    const allowedList = ALLOWED_MIME_TYPES[fileType] || [];
    if (!allowedList.includes(mimeType)) {
      return NextResponse.json({
        error: `Invalid ${fileType} type: ${mimeType}. Allowed: ${allowedList.join(', ')}`
      }, { status: 400 });
    }

    // 4. Size check
    const maxSize = fileType === 'video' ? MAX_VIDEO_SIZE : fileType === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large. Max ${fileType} size: ${Math.round(maxSize / (1024 * 1024))}MB`
      }, { status: 400 });
    }

    // 5. Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    // S3 expects plural folder names: images, videos, documents
    const s3FileType = (fileType + 's') as 'images' | 'videos' | 'documents';
    const url = await uploadAdminFile(buffer, `email-${Date.now()}-${file.name}`, s3FileType);

    return NextResponse.json({
      success: true,
      data: {
        url,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        fileType,
      },
    });
  } catch (error: any) {
    console.error('[Email Upload] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
