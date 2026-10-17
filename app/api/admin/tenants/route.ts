/**
 * Multi-Tenant SaaS — Tenant Management API (Pure BunnyDB)
 *
 * Endpoints:
 *   GET    /api/admin/tenants         – List all tenants (superadmin)
 *   POST   /api/admin/tenants         – Create (onboard) a new tenant
 *   PATCH  /api/admin/tenants         – Update an existing tenant
 *   DELETE /api/admin/tenants?slug=xx – Delete a tenant
 *
 * All routes require superadmin authentication.
 * Backed 100% by BunnyDB (crm_tenants_sql, admin_users_sql).
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-error';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listTenants,
  createTenant,
  updateTenant,
  deleteTenant,
} from '@/lib/tenant/bunnyTenantRepository';

export const dynamic = 'force-dynamic';

function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded || !isSuperAdmin(decoded)) {
    return null;
  }
  return decoded;
}

// Coerce an incoming pricing object to a safe, typed shape.
function sanitizePricing(p: any) {
  if (!p || typeof p !== 'object') return undefined;
  const num = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    monthlyPriceINR: num(p.monthlyPriceINR),
    storageIncludedMB: num(p.storageIncludedMB),
    extraStoragePriceINR: Number(p.extraStoragePriceINR) || 0,
    promoCode: String(p.promoCode || '').trim().toUpperCase(),
    promoDiscountPercent: Math.max(0, Math.min(100, Number(p.promoDiscountPercent) || 0)),
    billingCycle: ['monthly', 'quarterly', 'half_yearly', 'annual'].includes(p.billingCycle)
      ? p.billingCycle
      : 'monthly',
  };
}

// Keep only known numeric limit fields.
function sanitizeLimits(l: any) {
  if (!l || typeof l !== 'object') return undefined;
  const out: any = {};
  for (const k of ['maxLeads', 'maxUsers', 'maxStorageMB', 'maxWhatsAppTemplates', 'maxBroadcastsPerDay', 'maxApiRequestsPerDay']) {
    if (l[k] !== undefined && l[k] !== null && l[k] !== '') out[k] = Number(l[k]);
  }
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------
// GET — List tenants from BunnyDB
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const plan = searchParams.get('plan');
  const search = searchParams.get('search') || searchParams.get('q');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  try {
    const { tenants, pagination } = await listTenants({
      status,
      plan,
      search,
      page,
      limit,
    });

    return apiSuccess({
      tenants,
      pagination,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/tenants Error]:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to list tenants');
  }
}

// ---------------------------------------------------------------------------
// POST — Onboard a new tenant into BunnyDB
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  try {
    const body = await request.json();

    // Validation
    if (!body.name?.trim()) return apiError('VALIDATION_ERROR', 'name is required');
    if (!body.slug?.trim()) return apiError('VALIDATION_ERROR', 'slug is required');
    if (!body.ownerEmail?.trim()) return apiError('VALIDATION_ERROR', 'ownerEmail is required');
    if (!body.ownerUserId?.trim()) return apiError('VALIDATION_ERROR', 'ownerUserId is required');
    if (!body.password || body.password.length < 6) {
      return apiError('VALIDATION_ERROR', 'password must be at least 6 characters');
    }

    const ownerEmail = body.ownerEmail.trim().toLowerCase();
    const ownerUserId = body.ownerUserId.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      return apiError('VALIDATION_ERROR', 'Invalid owner email');
    }

    const slugRe = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
    const slug = body.slug.trim().toLowerCase();
    if (!slugRe.test(slug)) {
      return apiError('VALIDATION_ERROR', 'slug must be 3-50 lowercase alphanumeric characters with hyphens');
    }

    const tenant = await createTenant({
      slug,
      name: body.name.trim(),
      ownerEmail,
      ownerUserId,
      password: body.password,
      plan: body.plan,
      moduleKeys: body.moduleKeys,
      pricing: sanitizePricing(body.pricing),
      customLimits: sanitizeLimits(body.customLimits),
      subscriptionEndsAt: body.subscriptionEndsAt,
    });

    return apiSuccess(
      {
        tenant,
        message: `Tenant "${body.name}" created successfully with ${tenant.plan} plan in BunnyDB.`,
      },
      201
    );
  } catch (error: any) {
    console.error('[POST /api/admin/tenants Error]:', error);
    if (error.message?.includes('already exists')) {
      return apiError('DUPLICATE_ENTRY', error.message);
    }
    return apiError('SERVER_ERROR', error.message || 'Failed to create tenant');
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update tenant in BunnyDB
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  try {
    const body = await request.json();
    const { slug, ...updates } = body;

    if (!slug) return apiError('VALIDATION_ERROR', 'slug is required to identify the tenant');

    if (updates.pricing !== undefined) updates.pricing = sanitizePricing(updates.pricing);
    if (updates.customLimits !== undefined) updates.customLimits = sanitizeLimits(updates.customLimits);

    const updated = await updateTenant(slug, updates);
    return apiSuccess({ tenant: updated, message: 'Tenant updated.' });
  } catch (error: any) {
    console.error('[PATCH /api/admin/tenants Error]:', error);
    if (error.message?.includes('not found')) {
      return apiError('NOT_FOUND', error.message);
    }
    return apiError('SERVER_ERROR', error.message || 'Failed to update tenant');
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete tenant from BunnyDB
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!slug) return apiError('VALIDATION_ERROR', 'slug is required to identify the tenant');

  try {
    const result = await deleteTenant(slug);
    return apiSuccess({
      ...result,
      message: `Tenant "${slug}" deleted from BunnyDB.`,
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/tenants Error]:', error);
    if (error.message?.includes('not found')) {
      return apiError('NOT_FOUND', error.message);
    }
    return apiError('SERVER_ERROR', error.message || 'Failed to delete tenant');
  }
}
