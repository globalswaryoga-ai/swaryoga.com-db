/**
 * Plans API — editable plan tiers (Pure BunnyDB: crm_tenant_plans_sql).
 *
 * GET    /api/admin/tenants/plans — List plans (seeds on first call).
 * POST   /api/admin/tenants/plans — Create a custom plan (superadmin).
 * PATCH  /api/admin/tenants/plans — Update a plan by tier (superadmin).
 * DELETE /api/admin/tenants/plans?tier=xxx — Delete a plan (superadmin).
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiSuccess, apiError } from '@/lib/api-error';
import { ALL_GROUP_KEYS } from '@/lib/tenant/moduleCatalog';
import {
  getTenantPlans,
  saveTenantPlan,
  deleteTenantPlan,
  type PlanRecord,
} from '@/lib/tenant/bunnyTenantRepository';

export const dynamic = 'force-dynamic';

function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded || !isSuperAdmin(decoded)) return null;
  return decoded;
}

function sanitizeLimits(l: any) {
  const num = (v: any, d = 0) => (v === '' || v === null || v === undefined ? d : Number(v));
  return {
    maxLeads: num(l?.maxLeads),
    maxUsers: num(l?.maxUsers),
    maxStorageMB: num(l?.maxStorageMB),
    maxWhatsAppTemplates: num(l?.maxWhatsAppTemplates),
    maxBroadcastsPerDay: num(l?.maxBroadcastsPerDay),
    maxApiRequestsPerDay: num(l?.maxApiRequestsPerDay),
  };
}

function sanitizeGroups(g: any): string[] {
  if (!Array.isArray(g)) return [];
  return g.map(String).filter((k) => ALL_GROUP_KEYS.includes(k));
}

// ---------------------------------------------------------------------------
// GET — list plans from BunnyDB
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const plans = await getTenantPlans();
    return apiSuccess({ plans });
  } catch (err: any) {
    console.error('[GET /api/admin/tenants/plans Error]:', err);
    return apiError('SERVER_ERROR', err.message || 'Failed to fetch plans');
  }
}

// ---------------------------------------------------------------------------
// POST — Create / upsert a plan in BunnyDB
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');

  try {
    const body = await request.json();
    const tier = String(body.tier || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!tier) return apiError('VALIDATION_ERROR', 'tier is required');
    if (!body.name?.trim()) return apiError('VALIDATION_ERROR', 'name is required');

    const groups = sanitizeGroups(body.defaultGroups || body.enabledModules);

    const plan: PlanRecord = {
      tier,
      name: String(body.name).trim(),
      description: String(body.description || '').trim(),
      limits: sanitizeLimits(body.limits),
      defaultGroups: groups,
      enabledModules: groups,
      monthlyPriceINR: Number(body.monthlyPriceINR) || 0,
      annualPriceINR: Number(body.annualPriceINR) || 0,
      quarterlyPriceINR: Number(body.quarterlyPriceINR) || 0,
      halfYearlyPriceINR: Number(body.halfYearlyPriceINR) || 0,
      trialDays: Math.max(0, Number(body.trialDays) || 0),
      promoCode: String(body.promoCode || '').trim().toUpperCase(),
      discountPercent: Math.max(0, Math.min(100, Number(body.discountPercent) || 0)),
      order: Number(body.order) || 99,
      isCustom: body.isCustom !== undefined ? !!body.isCustom : true,
    };

    await saveTenantPlan(plan);
    return apiSuccess({ plan, message: `Plan "${plan.name}" saved in BunnyDB.` }, 201);
  } catch (err: any) {
    console.error('[POST /api/admin/tenants/plans Error]:', err);
    return apiError('SERVER_ERROR', err.message || 'Failed to save plan');
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update an existing plan in BunnyDB
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');

  try {
    const body = await request.json();
    const tier = String(body.tier || '').trim().toLowerCase();
    if (!tier) return apiError('VALIDATION_ERROR', 'tier is required');

    const plans = await getTenantPlans();
    const existing = plans.find((p) => p.tier.toLowerCase() === tier);
    if (!existing) return apiError('NOT_FOUND', `Plan "${tier}" not found`);

    const updatedGroups = body.defaultGroups !== undefined || body.enabledModules !== undefined
      ? sanitizeGroups(body.defaultGroups || body.enabledModules)
      : (existing.defaultGroups || []);

    const merged: PlanRecord = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      description: body.description !== undefined ? String(body.description).trim() : existing.description,
      limits: body.limits !== undefined ? sanitizeLimits(body.limits) : existing.limits,
      defaultGroups: updatedGroups,
      enabledModules: updatedGroups,
      monthlyPriceINR: body.monthlyPriceINR !== undefined ? Number(body.monthlyPriceINR) : existing.monthlyPriceINR,
      annualPriceINR: body.annualPriceINR !== undefined ? Number(body.annualPriceINR) : existing.annualPriceINR,
      quarterlyPriceINR: body.quarterlyPriceINR !== undefined ? Number(body.quarterlyPriceINR) : existing.quarterlyPriceINR,
      halfYearlyPriceINR: body.halfYearlyPriceINR !== undefined ? Number(body.halfYearlyPriceINR) : existing.halfYearlyPriceINR,
      trialDays: body.trialDays !== undefined ? Math.max(0, Number(body.trialDays)) : existing.trialDays,
      promoCode: body.promoCode !== undefined ? String(body.promoCode).trim().toUpperCase() : existing.promoCode,
      discountPercent: body.discountPercent !== undefined ? Math.max(0, Math.min(100, Number(body.discountPercent))) : existing.discountPercent,
      order: body.order !== undefined ? Number(body.order) : existing.order,
      isCustom: body.isCustom !== undefined ? !!body.isCustom : existing.isCustom,
    };

    await saveTenantPlan(merged);
    return apiSuccess({ plan: merged, message: `Plan "${merged.name}" updated in BunnyDB.` });
  } catch (err: any) {
    console.error('[PATCH /api/admin/tenants/plans Error]:', err);
    return apiError('SERVER_ERROR', err.message || 'Failed to update plan');
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete a plan in BunnyDB
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');

  const tier = new URL(request.url).searchParams.get('tier') || '';
  if (!tier) return apiError('VALIDATION_ERROR', 'tier is required');

  try {
    const deleted = await deleteTenantPlan(tier);
    if (!deleted) return apiError('NOT_FOUND', `Plan "${tier}" not found`);

    return apiSuccess({ deleted: true, tier, message: `Plan "${tier}" deleted from BunnyDB.` });
  } catch (err: any) {
    console.error('[DELETE /api/admin/tenants/plans Error]:', err);
    return apiError('SERVER_ERROR', err.message || 'Failed to delete plan');
  }
}
