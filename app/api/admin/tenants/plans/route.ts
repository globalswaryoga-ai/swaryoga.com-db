/**
 * Plans API — editable plan tiers (DB-backed, seeded from static config).
 *
 * GET    /api/admin/tenants/plans — List plans (public; seeds on first call).
 * POST   /api/admin/tenants/plans — Create a custom plan (superadmin).
 * PATCH  /api/admin/tenants/plans — Update a plan by tier (superadmin).
 * DELETE /api/admin/tenants/plans?tier=xxx — Delete a plan (superadmin).
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiSuccess, apiError } from '@/lib/api-error';
import { PLAN_DEFINITIONS } from '@/lib/tenant/plans';
import { PLAN_DEFAULT_GROUPS, ALL_GROUP_KEYS } from '@/lib/tenant/moduleCatalog';
import { getTenantPlanModel } from '@/lib/tenant/tenantSchemas';

export const dynamic = 'force-dynamic';

const TIER_ORDER = ['free', 'basic', 'starter', 'growth', 'professional', 'enterprise'];

function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded || !isSuperAdmin(decoded)) return null;
  return decoded;
}

// Seed the tenant_plans collection from static config on first use.
async function ensureSeeded(Plan: any) {
  const count = await Plan.countDocuments();
  if (count > 0) return;
  const docs = Object.values(PLAN_DEFINITIONS).map((p: any, i) => ({
    tier: p.tier,
    name: p.name,
    description: p.description,
    limits: {
      maxLeads: p.limits.maxLeads,
      maxUsers: p.limits.maxUsers,
      maxStorageMB: p.limits.maxStorageMB,
      maxWhatsAppTemplates: p.limits.maxWhatsAppTemplates,
      maxBroadcastsPerDay: p.limits.maxBroadcastsPerDay,
      maxApiRequestsPerDay: p.limits.maxApiRequestsPerDay,
    },
    defaultGroups: PLAN_DEFAULT_GROUPS[p.tier] || [],
    monthlyPriceINR: p.monthlyPriceINR,
    annualPriceINR: p.annualPriceINR,
    trialDays: p.tier === 'free' ? 0 : 7, // sensible default: 7-day trial on paid tiers
    order: TIER_ORDER.indexOf(p.tier) === -1 ? i : TIER_ORDER.indexOf(p.tier),
    isCustom: false,
  }));
  await Plan.insertMany(docs, { ordered: false }).catch(() => {});
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
// GET — list plans (seeds on first call)
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  await connectDB();
  const Plan = getTenantPlanModel();
  await ensureSeeded(Plan);

  const plans = await Plan.find({}).sort({ order: 1, monthlyPriceINR: 1 }).lean();
  // Keep response shape backwards-compatible (enabledModules from defaultGroups count).
  const shaped = plans.map((p: any) => ({
    tier: p.tier,
    name: p.name,
    description: p.description,
    limits: p.limits,
    defaultGroups: p.defaultGroups || [],
    enabledModules: p.defaultGroups || [],
    monthlyPriceINR: p.monthlyPriceINR,
    annualPriceINR: p.annualPriceINR,
    trialDays: p.trialDays ?? 0,
    promoCode: p.promoCode || '',
    discountPercent: p.discountPercent ?? 0,
    order: p.order ?? 0,
    isCustom: !!p.isCustom,
  }));

  return apiSuccess({ plans: shaped });
}

// ---------------------------------------------------------------------------
// POST — create a custom plan
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  await connectDB();
  const Plan = getTenantPlanModel();
  await ensureSeeded(Plan);

  const body = await request.json();
  const tier = String(body.tier || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!tier) return apiError('VALIDATION_ERROR', 'tier (slug) is required');
  if (!body.name?.trim()) return apiError('VALIDATION_ERROR', 'name is required');

  const existing = await Plan.findOne({ tier });
  if (existing) return apiError('DUPLICATE_ENTRY', `Plan "${tier}" already exists`);

  const maxOrder = await Plan.findOne({}).sort({ order: -1 }).select('order').lean();
  const created = await Plan.create({
    tier,
    name: body.name.trim(),
    description: String(body.description || '').trim(),
    limits: sanitizeLimits(body.limits),
    defaultGroups: sanitizeGroups(body.defaultGroups),
    monthlyPriceINR: Number(body.monthlyPriceINR) || 0,
    annualPriceINR: Number(body.annualPriceINR) || 0,
    trialDays: Math.max(0, Number(body.trialDays) || 0),
    promoCode: String(body.promoCode || '').trim().toUpperCase(),
    discountPercent: Math.max(0, Math.min(100, Number(body.discountPercent) || 0)),
    order: ((maxOrder as any)?.order ?? 0) + 1,
    isCustom: true,
  });

  return apiSuccess({ plan: created, message: 'Plan created.' }, 201);
}

// ---------------------------------------------------------------------------
// PATCH — update a plan by tier
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  await connectDB();
  const Plan = getTenantPlanModel();
  await ensureSeeded(Plan);

  const body = await request.json();
  const tier = String(body.tier || '').trim().toLowerCase();
  if (!tier) return apiError('VALIDATION_ERROR', 'tier is required');

  const $set: any = {};
  if (body.name !== undefined) $set.name = String(body.name).trim();
  if (body.description !== undefined) $set.description = String(body.description).trim();
  if (body.limits !== undefined) $set.limits = sanitizeLimits(body.limits);
  if (body.defaultGroups !== undefined) $set.defaultGroups = sanitizeGroups(body.defaultGroups);
  if (body.monthlyPriceINR !== undefined) $set.monthlyPriceINR = Number(body.monthlyPriceINR) || 0;
  if (body.annualPriceINR !== undefined) $set.annualPriceINR = Number(body.annualPriceINR) || 0;
  if (body.trialDays !== undefined) $set.trialDays = Math.max(0, Number(body.trialDays) || 0);
  if (body.promoCode !== undefined) $set.promoCode = String(body.promoCode).trim().toUpperCase();
  if (body.discountPercent !== undefined) $set.discountPercent = Math.max(0, Math.min(100, Number(body.discountPercent) || 0));
  if (body.order !== undefined) $set.order = Number(body.order) || 0;

  if (Object.keys($set).length === 0) return apiError('VALIDATION_ERROR', 'No fields to update');

  const updated = await Plan.findOneAndUpdate({ tier }, { $set }, { new: true }).lean();
  if (!updated) return apiError('NOT_FOUND', `Plan "${tier}" not found`);

  return apiSuccess({ plan: updated, message: 'Plan updated.' });
}

// ---------------------------------------------------------------------------
// DELETE — remove a plan by tier
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  await connectDB();
  const Plan = getTenantPlanModel();

  const tier = new URL(request.url).searchParams.get('tier')?.trim().toLowerCase();
  if (!tier) return apiError('VALIDATION_ERROR', 'tier query param is required');

  const res = await Plan.deleteOne({ tier });
  if (res.deletedCount === 0) return apiError('NOT_FOUND', `Plan "${tier}" not found`);

  return apiSuccess({ message: `Plan "${tier}" deleted.` });
}
