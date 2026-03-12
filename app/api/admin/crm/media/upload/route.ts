import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { uploadUserFile } from '@/lib/bunny-storage';
import { getViewerUserId } from '@/lib/crm-handlers';

export const runtime = 'nodejs';

// Max file size: 25MB (WhatsApp limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * POST /api/admin/crm/media/upload
 * Upload a file to user's isolated Bunny storage compartment.
 * Path: users/{userId}/media/{timestamp}-{rand}-{filename}
 * Accepts multipart/form-data with:
 *   - file: the file to upload
 *   - chatId (optional): chat JID for organizing into subcategory
 *   - category (optional): 'media' | 'documents' | 'images' | 'templates'
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const userId = getViewerUserId(decoded);
    if (!userId) {
      return apiError('Could not determine user ID', 400);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const chatId = (formData.get('chatId') as string) || undefined;
    const category = (formData.get('category') as string) || (chatId ? `media/chats/${chatId.replace(/[^a-zA-Z0-9@._-]/g, '_')}` : 'media');

    if (!file) {
      return apiError('No file provided', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadUserFile(buffer, file.name, userId, category, file.type);

    return apiSuccess({
      url: result.url,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      storagePath: result.storagePath,
      userId,
    });
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

    const configured = !!(process.env.BUNNY_STORAGE_API_KEY && process.env.BUNNY_STORAGE_ZONE_NAME);
    return apiSuccess({
      configured,
      hasStream: false,
    });
  } catch (err) {
    return apiError('Failed to check config', 500);
  }
}
