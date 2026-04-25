import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import {
  listUserFiles,
  deleteUserFile,
  getUserStorageUsage,
  getUserStoragePath,
} from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

/**
 * GET /api/admin/crm/files
 * List files in the authenticated user's Bunny storage compartment.
 * Query params:
 *   - category (optional): filter by 'media', 'documents', 'images', etc.
 *   - userId (optional, Super Admin only): view another user's files
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const viewerId = getViewerUserId(decoded);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    let targetUserId = searchParams.get('userId') || viewerId;

    // Only Super Admin can view other users' files
    if (targetUserId !== viewerId && !isSuperAdmin(decoded)) {
      return apiError('Access denied: cannot view another user\'s files', 403);
    }

    const files = await listUserFiles(targetUserId, category);
    const usage = await getUserStorageUsage(targetUserId);

    return apiSuccess({
      userId: targetUserId,
      compartmentPath: getUserStoragePath(targetUserId),
      files,
      fileCount: usage.fileCount,
      totalBytes: usage.totalBytes,
      totalMB: Number((usage.totalBytes / (1024 * 1024)).toFixed(2)),
    });
  } catch (err: any) {
    console.error('[crm-files GET]', err);
    return apiError(err.message || 'Failed to list files', 500);
  }
}

/**
 * DELETE /api/admin/crm/files
 * Delete a file from the authenticated user's Bunny storage compartment.
 * Body: { key: string, userId?: string (Super Admin only) }
 */
export async function DELETE(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const viewerId = getViewerUserId(decoded);
    const body = await req.json();
    const { key } = body;
    let targetUserId = body.userId || viewerId;

    if (!key) {
      return apiError('Missing required field: key', 400);
    }

    // Only Super Admin can delete other users' files
    if (targetUserId !== viewerId && !isSuperAdmin(decoded)) {
      return apiError('Access denied: cannot delete another user\'s files', 403);
    }

    // deleteUserFile validates key ownership internally
    const deleted = await deleteUserFile(targetUserId, key);

    return apiSuccess({
      deleted,
      key,
      userId: targetUserId,
    });
  } catch (err: any) {
    console.error('[crm-files DELETE]', err);
    if (err.message?.includes('Access denied')) {
      return apiError(err.message, 403);
    }
    return apiError(err.message || 'Failed to delete file', 500);
  }
}
