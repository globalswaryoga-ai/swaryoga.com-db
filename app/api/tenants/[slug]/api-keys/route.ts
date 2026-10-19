/**
 * API Key Management Routes (Pure BunnyDB)
 * GET /api/tenants/:slug/api-keys - List API keys
 * POST /api/tenants/:slug/api-keys - Create/Store new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantBySlug } from '@/lib/tenant/bunnyTenantRepository';
import {
  setTenantKey,
  listTenantKeyNames,
} from '@/lib/tenant/apiKeyVault';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

function tenantError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function tenantSuccess(data: any, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

// ============================================================================
// GET /api/tenants/:slug/api-keys - List API keys (tenant admin or superadmin)
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

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

    const keys = await listTenantKeyNames(tenant.slug);

    return tenantSuccess({
      tenantSlug: slug,
      keys: keys.map((keyName) => ({
        keyName,
        name: keyName,
        createdAt: tenant.updatedAt || new Date().toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/tenants/:slug/api-keys] Error:', error);
    return tenantError(error.message || 'Failed to list API keys', 400);
  }
}

// ============================================================================
// POST /api/tenants/:slug/api-keys - Create/Store new API key
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { name, keyName, value } = body;

    const actualKeyName = (keyName || name || '').trim();
    if (!actualKeyName) {
      return tenantError('API key name is required', 400);
    }

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

    // If a secret value is passed, use it; otherwise generate a new secure API key
    const generatedPlainKey = value || `swar_${crypto.randomBytes(24).toString('hex')}`;

    await setTenantKey(tenant.slug, actualKeyName, generatedPlainKey);

    return tenantSuccess(
      {
        message: 'API key configured successfully in BunnyDB vault',
        name: actualKeyName,
        plainKey: generatedPlainKey,
        warning: 'Save this key securely. The raw value will not be shown again.',
      },
      'API key saved',
      201
    );
  } catch (error: any) {
    console.error('[POST /api/tenants/:slug/api-keys] Error:', error);
    return tenantError(error.message || 'Failed to create API key', 400);
  }
}

