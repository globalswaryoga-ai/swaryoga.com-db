import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import {
  isBunnyStorageConfigured,
  uploadToBunnyStorage,
  generateCRMMediaPath,
} from '@/lib/bunny-storage';

export const runtime = 'nodejs';

// Max file size: 25MB (WhatsApp limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * POST /api/admin/crm/media/upload
 * Upload a file to Bunny Storage and return the CDN URL.
 * Accepts multipart/form-data with:
 *   - file: the file to upload
 *   - chatId (optional): chat JID for organizing files
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    if (!isBunnyStorageConfigured()) {
      return apiError(
        'Bunny Storage not configured. Add BUNNY_STORAGE_ZONE_NAME, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_CDN_HOST to .env.local',
        503
      );
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
    const filePath = generateCRMMediaPath(file.name, chatId);
    const cdnUrl = await uploadToBunnyStorage(buffer, filePath, { contentType: file.type });

    return apiSuccess({
      url: cdnUrl,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      storagePath: filePath,
    }, 'File uploaded');
  } catch (err: any) {
    console.error('[media-upload POST]', err);
    return apiError(err.message || 'Upload failed', 500);
  }
}

/**
 * GET /api/admin/crm/media/upload
 * Check if Bunny Storage is configured
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    return apiSuccess({
      configured: isBunnyStorageConfigured(),
      hasStream: !!(process.env.BUNNY_API_KEY && process.env.BUNNY_STREAM_LIBRARY_ID),
    });
  } catch (err) {
    return apiError('Failed to check config', 500);
  }
}
