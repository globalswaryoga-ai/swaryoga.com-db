import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { uploadToS3, buildS3Path } from '@/lib/aws-s3';

export const runtime = 'nodejs';

// Max file size: 25MB (WhatsApp limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * POST /api/admin/crm/media/upload
 * Upload a file to S3 and return the URL.
 * Accepts multipart/form-data with:
 *   - file: the file to upload
 *   - chatId (optional): chat JID for organizing files
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const chatId = (formData.get('chatId') as string) || undefined;

    if (!file) {
      return apiError('No file provided', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const subfolder = chatId ? `crm/chats/${chatId}` : 'crm/media';
    const s3Key = buildS3Path(subfolder, undefined, file.name);
    const s3Url = await uploadToS3(buffer, s3Key, { contentType: file.type });

    return apiSuccess({
      url: s3Url,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      storagePath: s3Key,
    }, 'File uploaded');
  } catch (err: any) {
    console.error('[media-upload POST]', err);
    return apiError(err.message || 'Upload failed', 500);
  }
}

/**
 * GET /api/admin/crm/media/upload
 * Check if S3 storage is configured
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const configured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET);
    return apiSuccess({
      configured,
      hasStream: false,
    });
  } catch (err) {
    return apiError('Failed to check config', 500);
  }
}
