/**
 * Plans API — editable plan tiers (DB-backed, seeded from static config).
 *
 * GET    /api/admin/tenants/plans — List plans (public; seeds on first call).
 * POST   /api/admin/tenants/plans — Create a custom plan (superadmin).
 * PATCH  /api/admin/tenants/plans — Update a plan by tier (superadmin).
 * DELETE /api/admin/tenants/plans?tier=xxx — Delete a plan (superadmin).
 */

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiSuccess, apiError } from '@/lib/api-error';
import { PLAN_DEFINITIONS } from '@/lib/tenant/plans';
import { PLAN_DEFAULT_GROUPS, ALL_GROUP_KEYS } from '@/lib/tenant/moduleCatalog';

export const dynamic = 'force-dynamic';

const TIER_ORDER = ['free', 'basic', 'starter', 'growth', 'professional', 'enterprise'];

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
// GET — list plans (seeds on first call)
// ---------------------------------------------------------------------------

// The cluster is at its 500-collection cap, so a dedicated tenant_plans
// collection can't be created. Instead all plans live as ONE document inside
// the existing `auto_config` collection: { key: 'tenant_plans', plans: [...] }.
const PLANS_DOC_KEY = 'tenant_plans';

function autoConfigCollection() {
  return mongoose.connection
    .useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm')
    .collection('auto_config');
}

async function readStoredPlans(): Promise<any[]> {
  const doc = await autoConfigCollection().findOne({ key: PLANS_DOC_KEY });
  return Array.isArray((doc as any)?.plans) ? (doc as any).plans : [];
}

async function writeStoredPlans(plans: any[]) {
  await autoConfigCollection().updateOne(
    { key: PLANS_DOC_KEY },
    { $set: { key: PLANS_DOC_KEY, plans, updatedAt: new Date() } },
    { upsert: true },
  );
}

function shapeDoc(p: any) {
  return {
    tier: p.tier,
    name: p.name,
    description: p.description || '',
    limits: p.limits || {},
    defaultGroups: p.defaultGroups || PLAN_DEFAULT_GROUPS[p.tier] || [],
    enabledModules: p.defaultGroups || PLAN_DEFAULT_GROUPS[p.tier] || [],
    monthlyPriceINR: p.monthlyPriceINR || 0,
    annualPriceINR: p.annualPriceINR || 0,
    quarterlyPriceINR: p.quarterlyPriceINR || 0,
    halfYearlyPriceINR: p.halfYearlyPriceINR || 0,
    trialDays: p.trialDays ?? 0,
    promoCode: p.promoCode || '',
    discountPercent: p.discountPercent ?? 0,
    order: p.order ?? 0,
    isCustom: !!p.isCustom,
  };
}

// The 6 tiers derived from static config — always available even if the DB
// tenant_plans collection is empty or unreachable.
function configPlans() {
  return Object.values(PLAN_DEFINITIONS).map((p: any) => shapeDoc({
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
    quarterlyPriceINR: p.monthlyPriceINR * 3,
    halfYearlyPriceINR: p.monthlyPriceINR * 6,
    trialDays: p.tier === 'free' ? 0 : 7,
    order: TIER_ORDER.indexOf(p.tier),
    isCustom: false,
  }));
}

export async function GET(_request: NextRequest) {
  // Always serve the full line-up from config, overridden by any stored edits.
  // Never 500 — an empty store still returns the config defaults.
  const byTier = new Map(configPlans().map((p) => [p.tier, p]));
  try {
    await connectDB();
    const stored = await readStoredPlans();
    for (const d of stored) byTier.set(d.tier, shapeDoc(d));
  } catch (e) {
    console.error('[plans GET] store read failed, serving config defaults:', e);
  }
  const plans = [...byTier.values()].sort((a, b) => (a.order - b.order) || (a.monthlyPriceINR - b.monthlyPriceINR));
  return apiSuccess({ plans });
}

// ---------------------------------------------------------------------------
// POST — create a custom plan
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    await connectDB();

    const body = await request.json();
    const tier = String(body.tier || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!tier) return apiError('VALIDATION_ERROR', 'tier (slug) is required');
    if (!body.name?.trim()) return apiError('VALIDATION_ERROR', 'name is required');

    const stored = await readStoredPlans();
    if (stored.some((p) => p.tier === tier) || configPlans().some((p) => p.tier === tier)) {
      return apiError('DUPLICATE_ENTRY', `Plan "${tier}" already exists`);
    }

    const maxOrder = Math.max(0, ...stored.map((p) => p.order || 0), ...configPlans().map((p) => p.order || 0));
    const doc = {
      tier,
      name: body.name.trim(),
      description: String(body.description || '').trim(),
      limits: sanitizeLimits(body.limits),
      defaultGroups: sanitizeGroups(body.defaultGroups),
      monthlyPriceINR: Number(body.monthlyPriceINR) || 0,
      annualPriceINR: Number(body.annualPriceINR) || 0,
      quarterlyPriceINR: Number(body.quarterlyPriceINR) || 0,
      halfYearlyPriceINR: Number(body.halfYearlyPriceINR) || 0,
      trialDays: Math.max(0, Number(body.trialDays) || 0),
      promoCode: String(body.promoCode || '').trim().toUpperCase(),
      discountPercent: Math.max(0, Math.min(100, Number(body.discountPercent) || 0)),
      order: maxOrder + 1,
      isCustom: true,
      updatedAt: new Date(),
    };
    stored.push(doc);
    await writeStoredPlans(stored);

    return apiSuccess({ plan: doc, message: 'Plan created.' }, 201);
  } catch (e) {
    console.error('[plans POST]', e);
    return apiError('SERVER_ERROR', e instanceof Error ? e.message : 'Failed to create plan');
  }
}

// ---------------------------------------------------------------------------
// PATCH — update a plan by tier
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    await connectDB();

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
    if (body.quarterlyPriceINR !== undefined) $set.quarterlyPriceINR = Number(body.quarterlyPriceINR) || 0;
    if (body.halfYearlyPriceINR !== undefined) $set.halfYearlyPriceINR = Number(body.halfYearlyPriceINR) || 0;
    if (body.trialDays !== undefined) $set.trialDays = Math.max(0, Number(body.trialDays) || 0);
    if (body.promoCode !== undefined) $set.promoCode = String(body.promoCode).trim().toUpperCase();
    if (body.discountPercent !== undefined) $set.discountPercent = Math.max(0, Math.min(100, Number(body.discountPercent) || 0));
    if (body.order !== undefined) $set.order = Number(body.order) || 0;

    if (Object.keys($set).length === 0) return apiError('VALIDATION_ERROR', 'No fields to update');

    // Update the plan inside the stored array. If this tier isn't stored yet
    // (config-default tier), start from its config base and apply the edits.
    const stored = await readStoredPlans();
    const idx = stored.findIndex((p) => p.tier === tier);
    let doc: any;
    if (idx >= 0) {
      doc = { ...stored[idx], ...$set, tier, updatedAt: new Date() };
      stored[idx] = doc;
    } else {
      const base = configPlans().find((p) => p.tier === tier);
      doc = { ...(base || {}), ...$set, tier, order: base?.order ?? 0, isCustom: !base, updatedAt: new Date() };
      stored.push(doc);
    }
    await writeStoredPlans(stored);
    return apiSuccess({ plan: doc, message: 'Plan saved.' });
  } catch (e) {
    console.error('[plans PATCH]', e);
    return apiError('SERVER_ERROR', e instanceof Error ? e.message : 'Failed to save plan');
  }
}

// ---------------------------------------------------------------------------
// DELETE — remove a plan by tier
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    await connectDB();
    const tier = new URL(request.url).searchParams.get('tier')?.trim().toLowerCase();
    if (!tier) return apiError('VALIDATION_ERROR', 'tier query param is required');

    const stored = await readStoredPlans();
    const next = stored.filter((p) => p.tier !== tier);
    if (next.length === stored.length) return apiError('NOT_FOUND', `Plan "${tier}" not found`);
    await writeStoredPlans(next);

    return apiSuccess({ message: `Plan "${tier}" deleted.` });
  } catch (e) {
    console.error('[plans DELETE]', e);
    return apiError('SERVER_ERROR', e instanceof Error ? e.message : 'Failed to delete plan');
  }
}
