import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  normalizePlanTier,
  resolveTenantPlanAccess,
  sanitizeTenantChannelAccess,
  sanitizeTenantCustomLimits,
  sanitizeTenantCustomPricing,
  sanitizeTenantModuleOverrides,
} from '@/lib/crm-site/tenantPlanAccess';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/crm-users
 * Super admin only: List all CRM users registered from crm.swaryoga.com
 * Includes their plan and QR WhatsApp numbers.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }
    if (!isSuperAdmin(decoded)) {
      return apiError('Super admin access required', 403);
    }

    await connectDB();
    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get query params
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const plan = url.searchParams.get('plan') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const skip = parseInt(url.searchParams.get('skip') || '0');

    // Build filter for admin_users (CRM users have tenantSlug)
    const userFilter: any = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      userFilter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { userId: regex },
      ];
    }

    // Get all admin_users (CRM users)
    const adminUsers = await db.collection('admin_users')
      .find(userFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalUsers = await db.collection('admin_users').countDocuments(userFilter);

    // Get tenant records for plan / custom access lookup
    const [tenants, crmTenants] = await Promise.all([
      db.collection('tenants').find({}).toArray(),
      db.collection('crm_tenants').find({}).toArray().catch(() => []),
    ]);
    const tenantMap = new Map<string, any>();
    const registerTenant = (tenant: any) => {
      if (!tenant) return;
      if (tenant.ownerEmail) tenantMap.set(`email:${String(tenant.ownerEmail).toLowerCase()}`, tenant);
      if (tenant.adminEmail) tenantMap.set(`email:${String(tenant.adminEmail).toLowerCase()}`, tenant);
      if (tenant.slug) tenantMap.set(`slug:${tenant.slug}`, { ...(tenantMap.get(`slug:${tenant.slug}`) || {}), ...tenant });
      if (tenant.tenantSlug) tenantMap.set(`slug:${tenant.tenantSlug}`, { ...(tenantMap.get(`slug:${tenant.tenantSlug}`) || {}), ...tenant });
    };
    tenants.forEach(registerTenant);
    crmTenants.forEach(registerTenant);

    // Get all QR settings for WhatsApp number lookup
    const allSettings = await db.collection('crm_user_settings').find({}).toArray();
    const settingsMap = new Map<string, any>();
    for (const s of allSettings) {
      settingsMap.set(s.userId, s);
    }

    // Build response
    const users = adminUsers.map((u: any) => {
      const tenant = tenantMap.get(`slug:${u.tenantSlug}`)
        || tenantMap.get(`email:${String(u.email || '').toLowerCase()}`)
        || tenantMap.get(`email:${String(u.userId || '').toLowerCase()}`);
      const settings = settingsMap.get(u.userId) || settingsMap.get(u.email);
      const planAccess = resolveTenantPlanAccess(tenant || { plan: u.planId || 'free' });
      const storagePlan = u.planId || planAccess.plan || 'free';
      const monthlyCost = planAccess.pricing.monthly ?? 0;

      return {
        _id: u._id?.toString(),
        userId: u.userId || u.email,
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'admin',
        isAdmin: u.isAdmin || false,
        tenantSlug: u.tenantSlug || '',
        plan: planAccess.plan,
        planLabel: planAccess.planName,
        businessName: tenant?.name || '',
        tenantStatus: tenant?.status || 'unknown',
        qrWhatsappEnabled: settings?.qrWhatsappEnabled || false,
        qrConnectedPhone: settings?.qrConnectedPhoneNumber || settings?.qrPhoneNumber || '',
        hasOwnBridge: !!settings?.qrBridgeUrl,
        createdAt: u.createdAt || null,
        lastLogin: u.lastLogin || null,
        // Billing / storage info
        storagePlan,
        monthlyCost,
        storagePaidUntil: u.storagePaidUntil || null,
        customPlanName: planAccess.customPlanName,
        customPricing: planAccess.customPricing,
        customLimits: planAccess.customLimits,
        moduleOverrides: planAccess.moduleOverrides,
        channelAccess: planAccess.channelAccess,
        // Payment tracking
        receivedAmount: u.receivedAmount ?? 0,
        paymentNote: u.paymentNote || '',
        paymentDate: u.paymentDate || null,
      };
    });

    // Filter by plan if specified
    let filteredUsers = users;
    if (plan) {
      filteredUsers = users.filter(u => u.plan === plan);
    }

    return apiSuccess({
      users: filteredUsers,
      total: plan ? filteredUsers.length : totalUsers,
      skip,
      limit,
      plans: ['free', 'basic', 'starter', 'growth', 'professional'],
    });
  } catch (err) {
    console.error('[crm-users GET]', err);
    return apiError('Failed to fetch CRM users', 500);
  }
}

/**
 * PUT /api/admin/crm/crm-users
 * Super admin only: Update CRM user settings (e.g., enable QR WhatsApp)
 */
export async function PUT(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }
    if (!isSuperAdmin(decoded)) {
      return apiError('Super admin access required', 403);
    }

    const body = await req.json();
    const {
      targetUserId,
      qrWhatsappEnabled,
      qrConnectedPhoneNumber,
      receivedAmount,
      paymentNote,
      paymentDate,
      plan,
      customPlanName,
      customPricing,
      customLimits,
      moduleOverrides,
      channelAccess,
    } = body;

    if (!targetUserId) {
      return apiError('targetUserId is required', 400);
    }

    await connectDB();
    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const now = new Date();

    const targetUser = await db.collection('admin_users').findOne(
      { $or: [{ userId: targetUserId }, { email: targetUserId }] },
      { projection: { userId: 1, email: 1, tenantSlug: 1 } }
    );

    if (!targetUser) {
      return apiError('Target CRM user not found', 404);
    }

    // CRM user settings updates (QR access)
    const settingsUpdate: Record<string, any> = { updatedAt: now };
    let hasSettingsUpdate = false;
    if (qrWhatsappEnabled !== undefined) { settingsUpdate.qrWhatsappEnabled = !!qrWhatsappEnabled; hasSettingsUpdate = true; }
    if (qrConnectedPhoneNumber !== undefined) { settingsUpdate.qrConnectedPhoneNumber = qrConnectedPhoneNumber; hasSettingsUpdate = true; }
    const normalizedChannelAccess = sanitizeTenantChannelAccess(channelAccess);
    if (normalizedChannelAccess.qrWhatsApp !== undefined) {
      settingsUpdate.qrWhatsappEnabled = !!normalizedChannelAccess.qrWhatsApp;
      hasSettingsUpdate = true;
    }

    if (hasSettingsUpdate) {
      await db.collection('crm_user_settings').updateOne(
        { userId: targetUser.userId || targetUser.email },
        { $set: settingsUpdate },
        { upsert: true }
      );
    }

    // Payment tracking updates (stored on admin_users)
    const userUpdate: Record<string, any> = {};
    let hasUserUpdate = false;
    if (receivedAmount !== undefined) { userUpdate.receivedAmount = Number(receivedAmount) || 0; hasUserUpdate = true; }
    if (paymentNote !== undefined) { userUpdate.paymentNote = String(paymentNote); hasUserUpdate = true; }
    if (paymentDate !== undefined) { userUpdate.paymentDate = paymentDate ? new Date(paymentDate) : null; hasUserUpdate = true; }

    const normalizedPlan = plan !== undefined ? normalizePlanTier(plan) : undefined;
    const normalizedLimits = sanitizeTenantCustomLimits(customLimits);
    const normalizedPricing = sanitizeTenantCustomPricing(customPricing);
    const normalizedModuleOverrides = sanitizeTenantModuleOverrides(moduleOverrides);

    if (normalizedPlan !== undefined) {
      userUpdate.planId = normalizedPlan;
      userUpdate.planName = String(customPlanName || normalizedPlan);
      if (normalizedLimits.storageQuotaMB !== undefined) {
        userUpdate.storageLimitMB = normalizedLimits.storageQuotaMB;
      }
      hasUserUpdate = true;

      const tenantUpdate: Record<string, any> = {
        plan: normalizedPlan,
        updatedAt: now,
        customPlanName: String(customPlanName || '').trim(),
        customPricing: normalizedPricing,
        customLimits: normalizedLimits,
        moduleOverrides: normalizedModuleOverrides,
        channelAccess: normalizedChannelAccess,
        'subscription.plan': normalizedPlan,
      };

      await Promise.all([
        db.collection('tenants').updateOne(
          {
            $or: [
              { slug: targetUser.tenantSlug || '__none__' },
              { tenantSlug: targetUser.tenantSlug || '__none__' },
              { ownerEmail: targetUser.email || '__none__' },
              { ownerUserId: targetUser.userId || '__none__' },
            ],
          },
          { $set: tenantUpdate }
        ),
        db.collection('crm_tenants').updateOne(
          {
            $or: [
              { slug: targetUser.tenantSlug || '__none__' },
              { tenantSlug: targetUser.tenantSlug || '__none__' },
              { ownerEmail: targetUser.email || '__none__' },
              { ownerUserId: targetUser.userId || '__none__' },
              { adminEmail: targetUser.email || '__none__' },
              { adminUserId: targetUser.userId || '__none__' },
            ],
          },
          { $set: tenantUpdate }
        ),
        db.collection('user_compartments').updateOne(
          { userId: targetUser.userId || targetUser.email },
          {
            $set: {
              updatedAt: now,
              'subscription.plan': normalizedPlan,
              ...(normalizedLimits.storageQuotaMB !== undefined
                ? { 'storage.quotaMB': normalizedLimits.storageQuotaMB }
                : {}),
            },
          }
        ),
      ]);
    }

    if (hasUserUpdate) {
      userUpdate.updatedAt = now;
      // Update by userId or email to find the right admin_user
      const result = await db.collection('admin_users').updateOne(
        { $or: [{ userId: targetUserId }, { email: targetUserId }] },
        { $set: userUpdate }
      );
      console.log(`[crm-users] Payment update for ${targetUserId}:`, userUpdate, 'matched:', result.matchedCount);
    }

    console.log(`[crm-users] Super admin ${decoded.userId} updated ${targetUserId}`);

    return apiSuccess({ success: true, targetUserId });
  } catch (err) {
    console.error('[crm-users PUT]', err);
    return apiError('Failed to update CRM user', 500);
  }
}
