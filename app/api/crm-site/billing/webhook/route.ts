import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { cashfreeGetOrder } from '@/lib/payments/cashfree';

/**
 * POST /api/crm-site/billing/webhook
 *
 * Cashfree webhook handler for CRM subscription payments.
 * On successful payment, upgrades tenant subscription tier.
 */

const PLAN_TO_TIER: Record<string, string> = {
  free: 'free',
  basic: 'basic',
  starter: 'starter',
  growth: 'growth',
  professional: 'professional',
};

const PLAN_LIMITS: Record<string, { maxLeads: number; maxUsers: number; maxChatbotFlows: number; storageQuotaMB: number }> = {
  free:         { maxLeads: 250,     maxUsers: 1,   maxChatbotFlows: 1,    storageQuotaMB: 100 },
  basic:        { maxLeads: 2000,    maxUsers: 2,   maxChatbotFlows: 5,    storageQuotaMB: 500 },
  starter:      { maxLeads: 5000,    maxUsers: 3,   maxChatbotFlows: 10,   storageQuotaMB: 1000 },
  growth:       { maxLeads: 25000,   maxUsers: 10,  maxChatbotFlows: 9999, storageQuotaMB: 5000 },
  professional: { maxLeads: 999999,  maxUsers: 999, maxChatbotFlows: 9999, storageQuotaMB: 50000 },
};

const PLAN_MODULES: Record<string, Record<string, boolean>> = {
  free: {
    leads: true, whatsapp: false, broadcasting: false, chatbot: true,
    aiCalls: false, reports: false, community: false, templates: false, callRecording: false,
  },
  basic: {
    leads: true, whatsapp: true, broadcasting: true, chatbot: true,
    aiCalls: false, reports: false, community: false, templates: true, callRecording: false,
  },
  starter: {
    leads: true, whatsapp: true, broadcasting: true, chatbot: true,
    aiCalls: false, reports: true, community: false, templates: true, callRecording: false,
  },
  growth: {
    leads: true, whatsapp: true, broadcasting: true, chatbot: true,
    aiCalls: true, reports: true, community: true, templates: true, callRecording: true,
  },
  professional: {
    leads: true, whatsapp: true, broadcasting: true, chatbot: true,
    aiCalls: true, reports: true, community: true, templates: true, callRecording: true,
  },
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'crm-billing-webhook',
    hint: 'POST Cashfree webhook events here',
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text().catch(() => '');
    if (!raw) {
      return NextResponse.json({ success: true, ignored: true, reason: 'empty-body' });
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ success: true, ignored: true, reason: 'invalid-json' });
    }

    // Extract Cashfree order ID
    const cfOrderId = String(
      body?.data?.order?.order_id ||
      body?.data?.order_id ||
      body?.order_id ||
      body?.orderId ||
      ''
    ).trim();

    if (!cfOrderId) {
      return NextResponse.json({ success: true, ignored: true, reason: 'missing-order_id' });
    }

    // Only process CRM billing orders (start with "CRM-")
    if (!cfOrderId.startsWith('CRM-')) {
      return NextResponse.json({ success: true, ignored: true, reason: 'not-crm-order' });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');

    // Find the billing order
    const billingOrder = await crmDb.collection('crm_billing_orders').findOne({ orderId: cfOrderId });
    if (!billingOrder) {
      console.warn(`CRM Billing Webhook: Order not found: ${cfOrderId}`);
      return NextResponse.json({ success: true, ignored: true, reason: 'order-not-found' });
    }

    // Get canonical status from Cashfree
    const cfStatus = await cashfreeGetOrder(cfOrderId);
    const orderStatus = String((cfStatus as any)?.order_status || '').toUpperCase();

    // Update billing order status
    await crmDb.collection('crm_billing_orders').updateOne(
      { orderId: cfOrderId },
      {
        $set: {
          cfStatus: orderStatus,
          updatedAt: new Date(),
          webhookReceivedAt: new Date(),
        },
      }
    );

    // Only process successful payments
    if (orderStatus !== 'PAID') {
      console.log(`CRM Billing: Order ${cfOrderId} status = ${orderStatus}, skipping upgrade`);
      return NextResponse.json({ success: true, status: orderStatus });
    }

    // ─── UPGRADE TENANT SUBSCRIPTION ───
    const { plan, billing, tenantSlug, email } = billingOrder;
    const tier = PLAN_TO_TIER[plan] || 'plan1';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
    const enabledModules = PLAN_MODULES[plan] || PLAN_MODULES.starter;

    // Calculate subscription dates
    const now = new Date();
    const subscriptionEndDate = new Date(now);
    if (billing === 'annual') {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    } else {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }

    // Find tenant by slug or email
    let tenantFilter: any = {};
    if (tenantSlug) {
      tenantFilter = { $or: [{ tenantSlug }, { slug: tenantSlug }] };
    } else if (email) {
      tenantFilter = { $or: [{ adminEmail: email }, { ownerEmail: email }] };
    }

    const updateResult = await mainDb.collection('tenants').updateOne(
      tenantFilter,
      {
        $set: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          subscriptionStartDate: now,
          subscriptionEndDate,
          limits,
          enabledModules,
          lastPaymentId: cfOrderId,
          lastPaymentDate: now,
          updatedAt: now,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      console.warn(`CRM Billing: Tenant not found for order ${cfOrderId}`);
    } else {
      console.log(`✅ CRM Billing: Upgraded tenant to ${plan} (${tier}) — Order: ${cfOrderId}`);
    }

    // Record payment in subscription history
    await mainDb.collection('subscription_history').insertOne({
      tenantSlug: tenantSlug || null,
      email,
      orderId: cfOrderId,
      plan,
      tier,
      billing,
      amount: billingOrder.amount,
      currency: billingOrder.currency || 'INR',
      status: 'PAID',
      subscriptionStartDate: now,
      subscriptionEndDate,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      upgraded: true,
      plan,
      tier,
      subscriptionEndDate,
    });
  } catch (err: any) {
    console.error('CRM Billing Webhook Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
