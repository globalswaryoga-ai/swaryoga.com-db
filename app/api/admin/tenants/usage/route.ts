/**
 * Tenant Usage & Stats API
 *
 * GET /api/admin/tenants/usage?slug=acme&days=30
 *   Returns daily usage snapshots for a specific tenant.
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-error';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getTenantUsageModel, getTenantModel } from '@/lib/tenant/tenantSchemas';
import { getTenantDb } from '@/lib/tenant/tenantDb';
import { resolveEffectiveLimits } from '@/lib/tenant/plans';

export async function GET(request: NextRequest) {
  await connectDB();

  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded || !isSuperAdmin(decoded)) return apiError('UNAUTHORIZED');

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return apiError('VALIDATION_ERROR', 'slug query param required');

  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '30', 10)));

  const Tenant = getTenantModel();
  const tenant = await Tenant.findOne({ slug }).lean() as any;
  if (!tenant) return apiError('NOT_FOUND', `Tenant "${slug}" not found`);

  // Get usage history
  const TenantUsage = getTenantUsageModel();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const usage = await TenantUsage.find({
    tenantId: slug,
    date: { $gte: cutoffStr },
  })
    .sort({ date: -1 })
    .lean();

  // Get live lead count from tenant's CRM DB
  let liveLeadCount = tenant.currentLeadCount || 0;
  try {
    const tenantDb = getTenantDb(slug);
    const db = tenantDb.db;
    if (db) {
      const leadsCol = db.collection('leads');
      liveLeadCount = await leadsCol.countDocuments();
    }
  } catch {
    // Non-fatal — use cached count
  }

  const limits = resolveEffectiveLimits(tenant.plan, tenant.customLimits);

  return apiSuccess({
    tenant: {
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
    },
    limits,
    currentUsage: {
      leads: liveLeadCount,
      users: tenant.currentUserCount || 0,
      storageMB: tenant.currentStorageMB || 0,
    },
    utilisation: {
      leadsPercent: Math.round((liveLeadCount / limits.maxLeads) * 100),
      usersPercent: Math.round(((tenant.currentUserCount || 0) / limits.maxUsers) * 100),
    },
    dailyUsage: usage,
  });
}
