/**
 * API Key Management Routes
 * GET /api/tenants/:slug/api-keys - List API keys
 * POST /api/tenants/:slug/api-keys - Create new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {


  getTenantBySlug,
  generateAPIKey,
  listAPIKeys,
} from '@/lib/multiTenant/handlers';

export const dynamic = 'force-dynamic';
import { tenantError, tenantSuccess } from '@/lib/multiTenant/middleware';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

// ============================================================================
// GET /api/tenants/:slug/api-keys - List API keys (tenant admin only)
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
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

    const keys = await listAPIKeys(tenant._id?.toString());

    return tenantSuccess({
      tenantSlug: slug,
      keys,
    });
  } catch (error: any) {
    console.error('[GET /api/tenants/:slug/api-keys] Error:', error);
    return tenantError(error.message || 'Failed to list API keys', 400);
  }
}

// ============================================================================
// POST /api/tenants/:slug/api-keys - Create new API key
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { name, permissions } = body;

    if (!name) {
      return tenantError('API key name is required', 400);
    }

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

    const defaultPermissions = [
      'leads:read',
      'leads:write',
      'messages:read',
      'messages:write',
    ];
    const keyPermissions = permissions || defaultPermissions;

    const apiKeyResult = await generateAPIKey(
      tenant._id?.toString(),
      slug,
      name,
      keyPermissions
    );

    return tenantSuccess(
      {
        message: 'API key created successfully',
        keyId: apiKeyResult.keyId,
        name: apiKeyResult.name,
        plainKey: apiKeyResult.plainKey,
        warning: 'Save this key securely. You will not be able to view it again.',
      },
      'API key created',
      201
    );
  } catch (error: any) {
    console.error('[POST /api/tenants/:slug/api-keys] Error:', error);
    return tenantError(error.message || 'Failed to create API key', 400);
  }
}
