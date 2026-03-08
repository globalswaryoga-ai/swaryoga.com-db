import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import jwt from 'jsonwebtoken';

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
    // Verify auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'swar-yoga-default-secret';
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantSlug = decoded.tenantSlug;
    if (!tenantSlug) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get tenant from main DB
    const tenant = await mainDb.collection('tenants').findOne({
      $or: [{ tenantSlug }, { slug: tenantSlug }],
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get usage stats from CRM DB
    const leadsCount = await crmDb.collection('leads').countDocuments({
      $or: [{ tenantSlug }, { tenantId: tenantSlug }],
    });

    const usersCount = await crmDb.collection('admin_users').countDocuments({
      tenantSlug,
    });

    // Get last payment from billing orders
    const lastPayment = await crmDb.collection('crm_billing_orders').findOne(
      { tenantSlug, cfStatus: 'PAID' },
      { sort: { createdAt: -1 } }
    );

    // Calculate storage used (approximate from DB stats)
    let storageUsedMB = 0;
    try {
      const dbStats = await crmDb.db.stats();
      // This is a rough estimate - divide total storage by number of tenants
      const tenantCount = await mainDb.collection('tenants').countDocuments();
      storageUsedMB = Math.round((dbStats.dataSize / (1024 * 1024)) / Math.max(1, tenantCount));
    } catch {
      storageUsedMB = 10; // Default fallback
    }

    // Build subscription response
    const subscription = {
      tenantSlug,
      plan: tenant.subscriptionTier || tenant.plan || 'free',
      billing: lastPayment?.billing || 'monthly',
      subscriptionStatus: tenant.subscriptionStatus || 'active',
      subscriptionStartDate: tenant.subscriptionStartDate || tenant.createdAt,
      subscriptionEndDate: tenant.subscriptionEndDate || null,

      // Usage
      storageUsedMB,
      storageQuotaMB: tenant.limits?.storageQuotaMB || 100,
      leadsUsed: leadsCount,
      leadsQuota: tenant.limits?.maxLeads || 250,
      usersCount,
      usersQuota: tenant.limits?.maxUsers || 1,

      // Payment info
      paymentMethod: lastPayment?.paymentMethod || null,
      autopayEnabled: lastPayment?.enableAutopay || false,
      lastPaymentDate: lastPayment?.createdAt || null,
      lastPaymentAmount: lastPayment?.amount || null,
    };

    return NextResponse.json({ success: true, subscription });
  } catch (err: any) {
    console.error('Subscription API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
