/**
 * Audit Trail API
 * GET /api/tally/audit-trail?fy=...&entityType=...&limit=...&skip=...
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAuditTrail } from '@/lib/tally/engine';
import { resolveTallyOwnerId } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const fy = request.nextUrl.searchParams.get('fy');
    if (!fy) return apiError('VALIDATION_ERROR', 'fy parameter required');

    const entityType = request.nextUrl.searchParams.get('entityType') || undefined;
    const entityId = request.nextUrl.searchParams.get('entityId') || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const skip = parseInt(request.nextUrl.searchParams.get('skip') || '0');

    const ownerId = resolveTallyOwnerId(decoded);
    const result = await getAuditTrail(fy, { entityType, entityId, limit, skip }, ownerId);
    return apiSuccess(result);
  } catch (e: any) {
    return apiError('INTERNAL_ERROR', e.message);
  }
}
