/**
 * API Key Revocation Route (Pure BunnyDB)
 * DELETE /api/tenants/:slug/api-keys/:keyId - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant/bunnyTenantRepository';
import { deleteTenantKey } from '@/lib/tenant/apiKeyVault';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

function tenantError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function tenantSuccess(data: any, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; keyId: string } }
) {
  try {
    const { slug, keyId } = params;

    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Authorization required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    const isAdmin =
      isSuperAdmin(decoded) ||
      decoded?.userId === tenant.ownerUserId ||
      decoded?.email === tenant.ownerEmail;
    if (!isAdmin) {
      return tenantError('Unauthorized', 403);
    }

    // In BunnyDB vault, the keyId / keyName is deleted
    const deleted = await deleteTenantKey(tenant.slug, keyId);

    return tenantSuccess({
      message: 'API key revoked successfully from BunnyDB vault',
      keyId,
      revoked: deleted,
      revokedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DELETE /api/tenants/:slug/api-keys/:keyId] Error:', error);
    return tenantError(error.message || 'Failed to revoke API key', 400);
  }
}

