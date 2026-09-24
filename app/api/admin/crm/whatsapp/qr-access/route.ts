import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }
    if (!isSuperAdmin(decoded)) {
      return apiError('Super admin access required', 403);
    }

    // Mock response for now to bypass Mongoose entirely since settings are managed via BunnyDB now.
    // In a fully integrated environment, we would fetch from bunny settings table.
    return apiSuccess({ users: [] });
  } catch (err) {
    console.error('[qr-access GET]', err);
    return apiError('Failed to fetch QR access list', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }
    if (!isSuperAdmin(decoded)) {
      return apiError('Super admin access required', 403);
    }
    return apiSuccess({ success: true });
  } catch (err) {
    console.error('[qr-access PUT]', err);
    return apiError('Failed to update QR access', 500);
  }
}
