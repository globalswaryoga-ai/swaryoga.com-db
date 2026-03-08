/**
 * API Key Revocation Route
 * DELETE /api/tenants/:slug/api-keys/:keyId - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getTenantBySlug, revokeAPIKey } from '@/lib/multiTenant/handlers';
import { tenantError, tenantSuccess } from '@/lib/multiTenant/middleware';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; keyId: string } }
) {
  try {
    const { slug, keyId } = params;
    await connectDB();

    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Authorization required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const tenant = await getTenantBySlug(slug) as any;
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    const isAdmin =
      isSuperAdmin(decoded) || decoded?.userId === tenant.adminUserId?.toString();
    if (!isAdmin) {
      return tenantError('Unauthorized', 403);
    }

    // Revoke the API key
    const revokedKey = await revokeAPIKey(tenant._id?.toString(), keyId);

    return tenantSuccess({
      message: 'API key revoked successfully',
      keyId: revokedKey._id,
      revokedAt: revokedKey.revokedAt,
    });
  } catch (error: any) {
    console.error('[DELETE /api/tenants/:slug/api-keys/:keyId] Error:', error);
    return tenantError(error.message || 'Failed to revoke API key', 400);
  }
}
