import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
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
import { sanitizeModuleKeys } from '@/lib/tenant/moduleCatalog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/crm-users
 * Super admin only: List all CRM users registered from crm.swaryoga.com using Bunny Database
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

    const url = new URL(req.url);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const skip = parseInt(url.searchParams.get('skip') || '0');

    // Query admin_users_sql, fallback to users table if empty
    let usersRes = await bunnyExecute(
      `SELECT * FROM admin_users_sql ORDER BY created_at DESC LIMIT 500`
    ).catch(() => ({ rows: [] }));

    if (usersRes.rows.length === 0) {
      usersRes = await bunnyExecute(
        `SELECT id, email, phone, full_name as name, role, created_at FROM users ORDER BY created_at DESC LIMIT 500`
      ).catch(() => ({ rows: [] }));
    }

    // Query tenants from crm_tenants_sql
    const tenantsRes = await bunnyExecute(
      `SELECT * FROM crm_tenants_sql`
    ).catch(() => ({ rows: [] }));

    const tenantMap = new Map<string, any>();
    for (const row of tenantsRes.rows) {
      try {
        const data = JSON.parse(String(row.data_json || '{}'));
        const tenant = { ...data, slug: row.tenant_slug || data.slug };
        if (tenant.ownerEmail) tenantMap.set(`email:${String(tenant.ownerEmail).toLowerCase()}`, tenant);
        if (tenant.slug) tenantMap.set(`slug:${tenant.slug}`, tenant);
      } catch {}
    }

    // Query QR settings
    const settingsRes = await bunnyExecute(
      `SELECT user_id, data_json FROM crm_user_settings_sql`
    ).catch(() => ({ rows: [] }));

    const settingsMap = new Map<string, any>();
    for (const row of settingsRes.rows) {
      try {
        const data = JSON.parse(String(row.data_json || '{}'));
        settingsMap.set(String(row.user_id), data);
      } catch {}
    }

    let allUsers = usersRes.rows.map((u: any) => {
      const email = String(u.email || '').toLowerCase();
      const userId = String(u.user_id || u.id || u.email || '');
      const tenant = tenantMap.get(`slug:${u.tenant_slug}`) || tenantMap.get(`email:${email}`);
      const settings = settingsMap.get(userId) || settingsMap.get(email);
      const planAccess = resolveTenantPlanAccess(tenant || { plan: u.planId || 'free' });

      return {
        _id: String(u.id || u.document_id || userId),
        userId,
        name: u.name || u.full_name || '',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'admin',
        isAdmin: Boolean(u.is_admin || u.isAdmin || u.role === 'superadmin' || u.role === 'admin'),
        tenantSlug: u.tenant_slug || '',
        plan: planAccess.plan,
        planLabel: planAccess.planName,
        businessName: tenant?.name || '',
        tenantStatus: tenant?.status || 'active',
        qrWhatsappEnabled: settings?.qrWhatsappEnabled || false,
        qrConnectedPhone: settings?.qrConnectedPhoneNumber || settings?.qrPhoneNumber || '',
        hasOwnBridge: !!settings?.qrBridgeUrl,
        createdAt: u.created_at || null,
        lastLogin: u.last_login_at || null,
        storagePlan: u.planId || planAccess.plan || 'free',
        monthlyCost: planAccess.pricing?.monthly ?? 0,
      };
    });

    if (search) {
      allUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.phone.includes(search) ||
        u.userId.toLowerCase().includes(search)
      );
    }

    const totalUsers = allUsers.length;
    const paginated = allUsers.slice(skip, skip + limit);

    return apiSuccess({
      users: paginated,
      total: totalUsers,
      limit,
      skip,
      hasMore: skip + paginated.length < totalUsers,
    });
  } catch (err) {
    console.error('[crm-users GET]', err);
    return apiError('Failed to fetch CRM users', 500);
  }
}

/**
 * PUT /api/admin/crm/crm-users
 * Super admin updates CRM user, plan, and settings
 */
export async function PUT(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('Unauthorized', 401);
    if (!isSuperAdmin(decoded)) return apiError('Super admin access required', 403);

    const body = await req.json();
    const {
      targetUserId,
      plan,
      customPlanName,
      customPricing,
      customLimits,
      moduleOverrides,
      moduleKeys,
      promoCode,
      discountPercent,
      channelAccess,
      qrWhatsappEnabled,
      qrConnectedPhoneNumber,
      receivedAmount,
      paymentNote,
      paymentDate,
    } = body;

    if (!targetUserId) return apiError('targetUserId is required', 400);

    const now = new Date().toISOString();

    if (qrWhatsappEnabled !== undefined || qrConnectedPhoneNumber !== undefined) {
      const existingSettingsRes = await bunnyExecute({
        sql: `SELECT data_json FROM crm_user_settings_sql WHERE user_id = ? LIMIT 1`,
        args: [targetUserId],
      }).catch(() => ({ rows: [] }));

      let existingData: any = {};
      if (existingSettingsRes.rows[0]) {
        try { existingData = JSON.parse(String(existingSettingsRes.rows[0].data_json)); } catch {}
      }

      if (qrWhatsappEnabled !== undefined) existingData.qrWhatsappEnabled = !!qrWhatsappEnabled;
      if (qrConnectedPhoneNumber !== undefined) existingData.qrConnectedPhoneNumber = qrConnectedPhoneNumber;
      existingData.updatedAt = now;

      await bunnyExecute({
        sql: `INSERT INTO crm_user_settings_sql (user_id, document_id, data_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
        args: [targetUserId, `settings_${targetUserId}`, JSON.stringify(existingData), now, now],
      }).catch(() => null);
    }

    return apiSuccess({ success: true, targetUserId });
  } catch (err) {
    console.error('[crm-users PUT]', err);
    return apiError('Failed to update CRM user', 500);
  }
}

/**
 * DELETE /api/admin/crm/crm-users
 */
export async function DELETE(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('Unauthorized', 401);
    if (!isSuperAdmin(decoded)) return apiError('Super admin access required', 403);

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.targetUserId;
    if (!targetUserId) return apiError('targetUserId is required', 400);

    await Promise.allSettled([
      bunnyExecute({ sql: `DELETE FROM admin_users_sql WHERE user_id = ? OR email = ?`, args: [targetUserId, targetUserId] }),
      bunnyExecute({ sql: `DELETE FROM crm_user_settings_sql WHERE user_id = ?`, args: [targetUserId] }),
    ]);

    return apiSuccess({ success: true, deleted: targetUserId });
  } catch (err) {
    console.error('[crm-users DELETE]', err);
    return apiError('Failed to delete CRM user', 500);
  }
}
