import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';
import { computeTrialState } from '@/lib/tenant/trial';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';


/**
 * GET /api/crm-site/subscription
 *
 * Returns the current tenant's subscription details including:
 * - Plan, billing cycle, status
 * - Usage (storage, leads, users)
 * - Payment info (last payment, autopay status)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify auth token using shared verifyToken
    const authHeader = request.headers.get('Authorization') || '';
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantSlug = (decoded as any).tenantSlug || '';
    const viewerId = getViewerUserId(decoded);
    const isSuper = isSuperAdmin(decoded);

    // Bunny SQL is the primary runtime store. MongoDB is intentionally not
    // contacted here because Atlas outages must not break subscription UI.
    const userResult = await bunnyExecute({
      sql: 'SELECT user_id,email,tenant_slug,created_at FROM admin_users_sql WHERE lower(user_id)=lower(?) OR lower(email)=lower(?) LIMIT 1',
      args: [viewerId, viewerId],
    });
    const user: any = userResult.rows[0] || {};
    const resolvedTenantSlug = String(tenantSlug || user.tenant_slug || '').trim();

    let tenant: any = null;
    if (resolvedTenantSlug) {
      const tenantResult = await bunnyExecute({
        sql: 'SELECT data_json FROM crm_tenants_sql WHERE tenant_slug=? LIMIT 1',
        args: [resolvedTenantSlug],
      });
      if (tenantResult.rows[0]?.data_json) {
        try { tenant = JSON.parse(String(tenantResult.rows[0].data_json)); } catch { tenant = null; }
      }
    } else if (viewerId) {
      const tenantResult = await bunnyExecute({
        sql: 'SELECT data_json FROM crm_tenants_sql WHERE json_extract(data_json, \'$.ownerUserId\')=? OR lower(json_extract(data_json, \'$.ownerEmail\'))=lower(?) LIMIT 1',
        args: [viewerId, String(user.email || viewerId)],
      });
      if (tenantResult.rows[0]?.data_json) {
        try { tenant = JSON.parse(String(tenantResult.rows[0].data_json)); } catch { tenant = null; }
      }
    }

    // If no tenant found, build a lightweight response from CRM data
    // This handles regular admin users who don't have a tenantSlug in their token
    let leadsCount = 0;
    let usersCount = 0;
    let storageUsedMB = 0;
    let lastPayment: any = null;

    if (tenant || resolvedTenantSlug) {
      const leadResult = await bunnyExecute({
        sql: 'SELECT count(*) AS count FROM leads_sql WHERE owner_user_id=? OR json_extract(data_json, \'$.tenantSlug\')=? OR json_extract(data_json, \'$.tenantId\')=?',
        args: [viewerId, resolvedTenantSlug, resolvedTenantSlug],
      });
      leadsCount = Number((leadResult.rows[0] as any)?.count || 0);
      const usersResult = await bunnyExecute({
        sql: 'SELECT count(*) AS count FROM admin_users_sql WHERE tenant_slug=?',
        args: [resolvedTenantSlug],
      });
      usersCount = Number((usersResult.rows[0] as any)?.count || 0);
    } else {
      const leadResult = await bunnyExecute({
        sql: isSuper ? 'SELECT count(*) AS count FROM leads_sql' : 'SELECT count(*) AS count FROM leads_sql WHERE owner_user_id=? OR json_extract(data_json, \'$.createdByUserId\')=? OR json_extract(data_json, \'$.assignedToUserId\')=?',
        args: isSuper ? [] : [viewerId, viewerId, viewerId],
      });
      leadsCount = Number((leadResult.rows[0] as any)?.count || 0);
      const usersResult = await bunnyExecute({
        sql: isSuper ? 'SELECT count(*) AS count FROM admin_users_sql' : 'SELECT count(*) AS count FROM admin_users_sql WHERE user_id=? OR tenant_slug=?',
        args: isSuper ? [] : [viewerId, resolvedTenantSlug],
      });
      usersCount = Number((usersResult.rows[0] as any)?.count || 0);
    }
    // Bunny SQL does not expose MongoDB db.stats(); use a safe baseline until
    // per-tenant storage accounting is available.
    storageUsedMB = 0;

    // Build subscription response
    const planAccess = resolveTenantPlanAccess(tenant);
    const plan = planAccess.plan;
    const subscription = {
      tenantSlug: resolvedTenantSlug || viewerId,
      plan,
      planName: planAccess.planName,
      billing: lastPayment?.billing || 'monthly',
      subscriptionStatus: tenant?.subscriptionStatus || 'active',
      subscriptionStartDate: tenant?.subscriptionStartDate || tenant?.createdAt || null,
      subscriptionEndDate: tenant?.subscriptionEndDate || null,

      // Usage
      storageUsedMB,
      storageQuotaMB: planAccess.limits.storageQuotaMB,
      leadsUsed: leadsCount,
      leadsQuota: planAccess.limits.maxLeads,
      usersCount,
      usersQuota: planAccess.limits.maxUsers,

      // Payment info
      paymentMethod: lastPayment?.paymentMethod || null,
      autopayEnabled: lastPayment?.enableAutopay || false,
      lastPaymentDate: lastPayment?.createdAt || null,
      lastPaymentAmount: lastPayment?.amount || null,
      pricing: planAccess.pricing,
      channelAccess: planAccess.channelAccess,

      // Trial / split-payment state
      ...(() => {
        const t = computeTrialState(tenant);
        return {
          isTrialActive: t.isTrialActive,
          trialDaysRemaining: t.trialDaysRemaining,
          trialEndDate: t.trialEndsAt,
          dataPaid: t.dataPaid,
          subscriptionPaid: t.subscriptionPaid,
          isLocked: t.isLocked,
          effectiveStatus: t.status,
        };
      })(),
    };

    return NextResponse.json({ success: true, subscription });
  } catch (err: any) {
    console.error('Subscription API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
