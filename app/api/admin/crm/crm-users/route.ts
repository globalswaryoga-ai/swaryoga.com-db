import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/crm-users
 * Super admin only: List all CRM users registered from crm.swaryoga.com
 * Includes their plan and QR WhatsApp numbers.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
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

    // Get all tenants for plan lookup
    const tenants = await db.collection('tenants').find({}).toArray();
    const tenantMap = new Map<string, any>();
    for (const t of tenants) {
      if (t.ownerEmail) tenantMap.set(t.ownerEmail, t);
      if (t.slug) tenantMap.set(`slug:${t.slug}`, t);
    }

    // Get all QR settings for WhatsApp number lookup
    const allSettings = await db.collection('crm_user_settings').find({}).toArray();
    const settingsMap = new Map<string, any>();
    for (const s of allSettings) {
      settingsMap.set(s.userId, s);
    }

    // Storage plan → monthly cost mapping (INR)
    const PLAN_COST: Record<string, number> = {
      free: 30,
      starter: 30,
      basic: 30,
      growth: 99,
      professional: 349,
      pro: 349,
    };

    // Build response
    const users = adminUsers.map((u: any) => {
      const tenant = tenantMap.get(u.email) || tenantMap.get(u.userId) || tenantMap.get(`slug:${u.tenantSlug}`);
      const settings = settingsMap.get(u.userId) || settingsMap.get(u.email);

      const storagePlan = u.planId || tenant?.plan || 'free';
      const monthlyCost = PLAN_COST[storagePlan] ?? 30;

      return {
        _id: u._id?.toString(),
        userId: u.userId || u.email,
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'admin',
        isAdmin: u.isAdmin || false,
        tenantSlug: u.tenantSlug || '',
        plan: tenant?.plan || 'free',
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
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 401);
    }
    if (!isSuperAdmin(decoded)) {
      return apiError('Super admin access required', 403);
    }

    const body = await req.json();
    const { targetUserId, qrWhatsappEnabled, qrConnectedPhoneNumber, receivedAmount, paymentNote, paymentDate } = body;

    if (!targetUserId) {
      return apiError('targetUserId is required', 400);
    }

    await connectDB();
    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // CRM user settings updates (QR access)
    const settingsUpdate: Record<string, any> = { updatedAt: new Date() };
    let hasSettingsUpdate = false;
    if (qrWhatsappEnabled !== undefined) { settingsUpdate.qrWhatsappEnabled = !!qrWhatsappEnabled; hasSettingsUpdate = true; }
    if (qrConnectedPhoneNumber !== undefined) { settingsUpdate.qrConnectedPhoneNumber = qrConnectedPhoneNumber; hasSettingsUpdate = true; }

    if (hasSettingsUpdate) {
      await db.collection('crm_user_settings').updateOne(
        { userId: targetUserId },
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

    if (hasUserUpdate) {
      userUpdate.updatedAt = new Date();
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
