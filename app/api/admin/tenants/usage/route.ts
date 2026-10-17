/**
 * Tenant Usage & Stats API (Pure BunnyDB)
 *
 * GET /api/admin/tenants/usage?slug=acme
 *   Returns live usage and limit utilisation for a tenant from BunnyDB.
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-error';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getTenantBySlug } from '@/lib/tenant/bunnyTenantRepository';
import { resolveEffectiveLimits } from '@/lib/tenant/plans';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded || !isSuperAdmin(decoded)) return apiError('UNAUTHORIZED');

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return apiError('VALIDATION_ERROR', 'slug query param required');

  try {
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return apiError('NOT_FOUND', `Tenant "${slug}" not found`);

    // Live lead count from leads_sql
    let liveLeadCount = tenant.currentLeadCount || 0;
    try {
      const owners = Array.from(new Set([tenant.ownerUserId, tenant.ownerEmail, slug].filter(Boolean)));
      const placeholders = owners.map(() => '?').join(', ');
      const res = await bunnyExecute({
        sql: `SELECT COUNT(*) as count FROM leads_sql WHERE owner_user_id IN (${placeholders})`,
        args: owners,
      });
      liveLeadCount = Number(res.rows[0]?.count || 0);
    } catch {
      // Non-fatal — fallback to cached count
    }

    const limits = resolveEffectiveLimits(tenant.plan as any, tenant.customLimits);

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
        leadsPercent: Math.round((liveLeadCount / (limits.maxLeads || 1)) * 100),
        usersPercent: Math.round(((tenant.currentUserCount || 0) / (limits.maxUsers || 1)) * 100),
      },
      dailyUsage: [],
    });
  } catch (err: any) {
    console.error('[GET /api/admin/tenants/usage Error]:', err);
    return apiError('SERVER_ERROR', err.message || 'Failed to fetch tenant usage');
  }
}
