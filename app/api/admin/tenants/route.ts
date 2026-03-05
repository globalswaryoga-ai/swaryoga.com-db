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
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-error';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';
import { provisionTenantDb, tenantDbName } from '@/lib/tenant/tenantDb';
import { PlanTier } from '@/lib/tenant/types';
import type { CreateTenantRequest } from '@/lib/tenant/types';

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

  // Slug format: 3-50 lowercase alphanumeric + hyphens
  const slugRe = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  const slug = body.slug.trim().toLowerCase();
  if (!slugRe.test(slug)) {
    return apiError('VALIDATION_ERROR', 'slug must be 3-50 lowercase alphanumeric characters with hyphens');
  }

  const Tenant = getTenantModel();

  // Check uniqueness
  const existing = await Tenant.findOne({ slug });
  if (existing) {
    return apiError('DUPLICATE_ENTRY', `Tenant with slug "${slug}" already exists`);
  }

  // Derive DB name
  const dbName = tenantDbName(slug);

  // Plan defaults to FREE
  const plan = body.plan && Object.values(PlanTier).includes(body.plan) ? body.plan : PlanTier.FREE;

  // Create tenant document
  const tenant = await Tenant.create({
    slug,
    name: body.name.trim(),
    ownerEmail: body.ownerEmail.trim().toLowerCase(),
    ownerUserId: body.ownerUserId.trim(),
    plan,
    enabledModules: [],
    dbName,
    subdomain: slug,
    status: 'active',
    currentLeadCount: 0,
    currentUserCount: 0,
    currentStorageMB: 0,
  });

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

  // Allowlist of updatable fields
  const allowed = [
    'name', 'plan', 'customLimits', 'enabledModules',
    'customDomain', 'customDomainVerified', 'status',
    'subscriptionEndsAt', 'ownerEmail', 'ownerUserId',
  ];

  const $set: any = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      $set[key] = updates[key];
    }
  }

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
