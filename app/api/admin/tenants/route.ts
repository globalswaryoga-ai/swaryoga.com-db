/**
 * Multi-Tenant SaaS — Tenant Management API
 *
 * Endpoints:
 *   GET    /api/admin/tenants         – List all tenants (superadmin)
 *   POST   /api/admin/tenants         – Create (onboard) a new tenant
 *   PATCH  /api/admin/tenants         – Update an existing tenant
 *
 * All routes require superadmin authentication.
 */

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-error';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';
import { provisionTenantDb, tenantDbName } from '@/lib/tenant/tenantDb';
import { PlanTier } from '@/lib/tenant/types';
import type { CreateTenantRequest } from '@/lib/tenant/types';
import { sanitizeModuleKeys, expandGroups, PLAN_DEFAULT_GROUPS } from '@/lib/tenant/moduleCatalog';

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

export const dynamic = 'force-dynamic';


// ---------------------------------------------------------------------------
// Auth guard (superadmin only)
// ---------------------------------------------------------------------------

function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded || !isSuperAdmin(decoded)) {
    return null;
  }
  return decoded;
}

// ---------------------------------------------------------------------------
// GET — List tenants
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  await connectDB();

  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  const Tenant = getTenantModel();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const plan = searchParams.get('plan');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (status) filter.status = status;
  if (plan) filter.plan = plan;

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Tenant.countDocuments(filter),
  ]);

  return apiSuccess({
    tenants,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ---------------------------------------------------------------------------
// POST — Onboard a new tenant
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  await connectDB();

  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  const body: CreateTenantRequest = await request.json();

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

  // Slug format: 3-50 lowercase alphanumeric + hyphens
  const slugRe = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  const slug = body.slug.trim().toLowerCase();
  if (!slugRe.test(slug)) {
    return apiError('VALIDATION_ERROR', 'slug must be 3-50 lowercase alphanumeric characters with hyphens');
  }

  const Tenant = getTenantModel();
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Check uniqueness
  const existing = await Tenant.findOne({ slug });
  if (existing) {
    return apiError('DUPLICATE_ENTRY', `Tenant with slug "${slug}" already exists`);
  }

  // A tenant created here must also have a CRM login. Check both identifiers
  // case-insensitively so legacy mixed-case accounts cannot be duplicated.
  const existingLogin = await crmDb.collection('admin_users').findOne(
    { $or: [{ email: ownerEmail }, { userId: ownerUserId }] },
    { collation: { locale: 'en', strength: 2 } },
  );
  if (existingLogin) {
    return apiError('DUPLICATE_ENTRY', 'An account with this owner email or user ID already exists');
  }

  // Derive DB name
  const dbName = tenantDbName(slug);

  // Plan defaults to FREE
  const plan = body.plan && Object.values(PlanTier).includes(body.plan) ? body.plan : PlanTier.FREE;

  // Module keys: use explicit selection if provided, else expand the plan's default bundles.
  const anyBody = body as any;
  const moduleKeys = Array.isArray(anyBody.moduleKeys) && anyBody.moduleKeys.length
    ? sanitizeModuleKeys(anyBody.moduleKeys)
    : expandGroups(PLAN_DEFAULT_GROUPS[plan] || PLAN_DEFAULT_GROUPS.free);

  // Create tenant document
  const passwordHash = await bcrypt.hash(body.password, 12);
  const tenant = await Tenant.create({
    slug,
    name: body.name.trim(),
    ownerEmail,
    ownerUserId,
    plan,
    enabledModules: [],
    moduleKeys,
    pricing: sanitizePricing(anyBody.pricing),
    customLimits: sanitizeLimits(anyBody.customLimits),
    subscriptionEndsAt: anyBody.subscriptionEndsAt ? new Date(anyBody.subscriptionEndsAt) : undefined,
    dbName,
    subdomain: slug,
    status: 'active',
    currentLeadCount: 0,
    currentUserCount: 0,
    currentStorageMB: 0,
  });

  try {
    const now = new Date();
    await crmDb.collection('admin_users').insertOne({
      userId: ownerUserId,
      email: ownerEmail,
      password: passwordHash,
      name: body.name.trim(),
      role: 'admin',
      isAdmin: true,
      isActive: true,
      status: 'active',
      tenantSlug: slug,
      planId: plan,
      planName: plan,
      setupComplete: false,
      loginCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    // Do not leave a tenant that can never log in if account creation fails.
    await Tenant.deleteOne({ _id: tenant._id });
    throw error;
  }

  // Provision the tenant's database (create collections + seed)
  const provisionResult = await provisionTenantDb(slug);

  return apiSuccess(
    {
      tenant,
      provisioning: provisionResult,
      message: `Tenant "${body.name}" created successfully with ${plan} plan.`,
    },
    201,
  );
}

// ---------------------------------------------------------------------------
// PATCH — Update tenant (plan, limits, status, domain, etc.)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  await connectDB();

  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  const body = await request.json();
  const { slug, ...updates } = body;

  if (!slug) return apiError('VALIDATION_ERROR', 'slug is required to identify the tenant');

  const Tenant = getTenantModel();
  const tenant = await Tenant.findOne({ slug });
  if (!tenant) return apiError('NOT_FOUND', `Tenant "${slug}" not found`);

  // Allowlist of updatable fields.
  // NOTE: ownerUserId is intentionally NOT updatable — it is the tenant-wide
  // data-scoping key (createdByUserId / scope / ownerUserId on every record).
  // Changing it would orphan all the tenant's data. We can change the login
  // email/name/phone while keeping ownerUserId fixed (see admin_users sync below).
  const allowed = [
    'name', 'plan', 'customDomain', 'customDomainVerified', 'status',
    'subscriptionEndsAt', 'ownerEmail', 'ownerName', 'ownerPhone', 'enabledModules',
  ];

  const $set: any = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      $set[key] = updates[key];
    }
  }

  // Normalize owner email.
  if (typeof $set.ownerEmail === 'string') {
    $set.ownerEmail = $set.ownerEmail.trim().toLowerCase();
    if ($set.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($set.ownerEmail)) {
      return apiError('VALIDATION_ERROR', 'Invalid owner email');
    }
  }

  // ── Sync the login account (admin_users) so the tenant can actually log in
  // with the new email / see the new name / phone. The login identity (userId)
  // is kept stable; only the email/name/phone fields change.
  const wantsOwnerSync =
    $set.ownerEmail !== undefined || $set.ownerName !== undefined || $set.ownerPhone !== undefined;
  if (wantsOwnerSync) {
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const stableUserId = String(tenant.ownerUserId || '').trim();
    const currentEmail = String(tenant.ownerEmail || '').trim().toLowerCase();

    const adminSet: Record<string, any> = {};
    if ($set.ownerEmail !== undefined) adminSet.email = $set.ownerEmail;
    if ($set.ownerName !== undefined) adminSet.name = $set.ownerName;
    if ($set.ownerPhone !== undefined) adminSet.phone = $set.ownerPhone;

    // Reject an email already taken by a different login account.
    if (adminSet.email && adminSet.email !== currentEmail) {
      const clash = await crmDb.collection('admin_users').findOne({
        email: adminSet.email,
        userId: { $ne: stableUserId },
      });
      if (clash) return apiError('VALIDATION_ERROR', 'That email is already used by another account');
    }

    if (Object.keys(adminSet).length > 0) {
      adminSet.updatedAt = new Date();
      await crmDb.collection('admin_users').updateOne(
        { $or: [{ userId: stableUserId }, { email: currentEmail }] },
        { $set: adminSet },
      );
    }
  }

  // Structured fields get sanitized before persisting.
  if (updates.moduleKeys !== undefined) $set.moduleKeys = sanitizeModuleKeys(updates.moduleKeys);
  if (updates.pricing !== undefined) $set.pricing = sanitizePricing(updates.pricing);
  if (updates.customLimits !== undefined) $set.customLimits = sanitizeLimits(updates.customLimits);

  if (Object.keys($set).length === 0) {
    return apiError('VALIDATION_ERROR', 'No valid fields to update');
  }

  const updated = await Tenant.findOneAndUpdate(
    { slug },
    { $set },
    { new: true, runValidators: true },
  ).lean();

  return apiSuccess({ tenant: updated, message: 'Tenant updated.' });
}

/**
 * DELETE /api/admin/tenants?slug=<slug>
 * Super-admin only. Removes the tenant registry record AND its login account
 * (admin_users). Does NOT drop the tenant's provisioned DB or delete their
 * leads — those are left intact to avoid irreversible data loss.
 */
export async function DELETE(request: NextRequest) {
  await connectDB();

  const decoded = requireSuperAdmin(request);
  if (!decoded) return apiError('UNAUTHORIZED');

  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!slug) return apiError('VALIDATION_ERROR', 'slug is required to identify the tenant');

  const Tenant = getTenantModel();
  const tenant = await Tenant.findOne({ slug }).lean() as any;
  if (!tenant) return apiError('NOT_FOUND', `Tenant "${slug}" not found`);

  await Tenant.deleteOne({ slug });

  // Remove the login account so the tenant can no longer sign in.
  let loginRemoved = 0;
  const ownerEmail = String(tenant.ownerEmail || '').trim().toLowerCase();
  if (ownerEmail) {
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const r = await crmDb.collection('admin_users').deleteOne({ email: ownerEmail });
    loginRemoved = r.deletedCount || 0;
  }

  return apiSuccess({ deleted: true, slug, loginRemoved, message: `Tenant "${tenant.name || slug}" deleted. Their leads were kept.` });
}
