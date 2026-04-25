/**
 * Tenant API Key Vault API
 *
 * POST   /api/admin/tenants/keys  – Store/update a secret
 * GET    /api/admin/tenants/keys  – List key names (no values)
 * DELETE /api/admin/tenants/keys  – Remove a secret
 *
 * Values are AES-256-GCM encrypted at rest; plaintext never returned via API.
 * Only superadmins can manage keys.
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-error';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {

export const dynamic = 'force-dynamic';

  setTenantKey,
  deleteTenantKey,
  listTenantKeyNames,
} from '@/lib/tenant/apiKeyVault';


function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded || !isSuperAdmin(decoded)) return null;
  return decoded;
}

// ---------------------------------------------------------------------------
// GET — List key names for a tenant (no values returned)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  await connectDB();
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return apiError('VALIDATION_ERROR', 'slug query param required');

  const keyNames = await listTenantKeyNames(slug);
  return apiSuccess({ tenantId: slug, keys: keyNames });
}

// ---------------------------------------------------------------------------
// POST — Store or update a secret
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  await connectDB();
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');

  const { slug, keyName, value } = await request.json();
  if (!slug || !keyName || !value) {
    return apiError('VALIDATION_ERROR', 'slug, keyName, and value are required');
  }

  await setTenantKey(slug, keyName, value);
  return apiSuccess({ message: `Key "${keyName}" stored for tenant "${slug}".` }, 201);
}

// ---------------------------------------------------------------------------
// DELETE — Remove a secret
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  await connectDB();
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');

  const { slug, keyName } = await request.json();
  if (!slug || !keyName) {
    return apiError('VALIDATION_ERROR', 'slug and keyName are required');
  }

  const deleted = await deleteTenantKey(slug, keyName);
  if (!deleted) return apiError('NOT_FOUND', `Key "${keyName}" not found for tenant "${slug}"`);

  return apiSuccess({ message: `Key "${keyName}" deleted for tenant "${slug}".` });
}
