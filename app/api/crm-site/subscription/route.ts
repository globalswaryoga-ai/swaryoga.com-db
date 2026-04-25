import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

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

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Try to find tenant — tenantSlug may be absent for regular admin users
    let tenant: any = null;
    if (tenantSlug) {
      tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug })
        || await mainDb.collection('tenants').findOne({
        $or: [{ tenantSlug }, { slug: tenantSlug }],
      });
    }

    // If no tenant found, build a lightweight response from CRM data
    // This handles regular admin users who don't have a tenantSlug in their token
    let leadsCount = 0;
    let usersCount = 0;
    let storageUsedMB = 0;
    let lastPayment: any = null;

    if (tenant) {
      // Get usage stats from CRM DB scoped to tenant
      leadsCount = await crmDb.collection('leads').countDocuments({
        $or: [{ tenantSlug }, { tenantId: tenantSlug }],
      });
      usersCount = await crmDb.collection('admin_users').countDocuments({ tenantSlug });
      lastPayment = await crmDb.collection('crm_billing_orders').findOne(
        { tenantSlug, cfStatus: 'PAID' },
        { sort: { createdAt: -1 } }
      );
    } else {
      // For regular admin users without tenantSlug — scope by ownerId
      const ownerFilter = isSuper ? {} : { ownerId: viewerId };
      leadsCount = await crmDb.collection('crm_leads').countDocuments(ownerFilter);
      usersCount = await crmDb.collection('admin_users').countDocuments(
        isSuper ? {} : { $or: [{ userId: viewerId }, { createdBy: viewerId }] }
      );
    }

    // Calculate storage used (approximate from DB stats)
    try {
      const dbStats = await crmDb.db.stats();
      const tenantCount = Math.max(1, await mainDb.collection('tenants').countDocuments());
      storageUsedMB = Math.round((dbStats.dataSize / (1024 * 1024)) / tenantCount);
    } catch {
      storageUsedMB = 10;
    }

    // Build subscription response
    const planAccess = resolveTenantPlanAccess(tenant);
    const plan = planAccess.plan;
    const subscription = {
      tenantSlug: tenantSlug || viewerId,
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
    };

    return NextResponse.json({ success: true, subscription });
  } catch (err: any) {
    console.error('Subscription API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
