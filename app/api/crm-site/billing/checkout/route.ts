import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { cashfreeCreateOrder } from '@/lib/payments/cashfree';

/**
 * POST /api/crm-site/billing/checkout
 *
 * Creates a Cashfree payment order for a CRM plan subscription.
 * Called after signup for paid plans (Starter, Growth, Professional, Enterprise).
 *
 * Expects: { plan, email, name, phone, tenantSlug }
 * Returns: { paymentSessionId, orderId }
 */

function getCrmBillingReturnUrl(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.origin}/api/crm-site/billing/return?order_id={order_id}`;
}

function getCrmBillingWebhookUrl(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.origin}/api/crm-site/billing/webhook`;
}

const PLAN_PRICES: Record<string, { monthly: number; quarterly: number; annual: number; name: string }> = {
  basic:        { monthly: 999,   quarterly: 2997,  annual: 9990,   name: 'Basic Plan' },
  starter:      { monthly: 1999,  quarterly: 5997,  annual: 19990,  name: 'Starter Plan' },
  growth:       { monthly: 4999,  quarterly: 14997, annual: 49990,  name: 'Growth Plan' },
  professional: { monthly: 9999,  quarterly: 29997, annual: 99990,  name: 'Professional Plan' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, billing = 'monthly', email, name, phone, tenantSlug } = body;

    /* ─── Validate ─── */
    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }
    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Email and name are required.' }, { status: 400 });
    }

    const planInfo = PLAN_PRICES[plan];
    const amount = billing === 'annual' ? planInfo.annual : billing === 'quarterly' ? planInfo.quarterly : planInfo.monthly;

    await connectDB();

    /* ─── Create order ID ─── */
    const orderId = `CRM-${tenantSlug || 'new'}-${plan}-${Date.now()}`.replace(/[^a-zA-Z0-9-_]/g, '');

    /* ─── Create Cashfree order ─── */
    const cashfreeOrder = await cashfreeCreateOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
        customer_name: name.trim(),
        customer_email: email.trim().toLowerCase(),
        customer_phone: phone?.trim() || '9999999999',
      },
      order_note: `${planInfo.name} — ${billing === 'annual' ? 'Annual' : billing === 'quarterly' ? 'Quarterly' : 'Monthly'} subscription`,
      order_meta: {
        return_url: getCrmBillingReturnUrl(request),
        notify_url: getCrmBillingWebhookUrl(request),
      },
    });

    if (!cashfreeOrder.payment_session_id) {
      console.error('Cashfree order missing payment_session_id:', cashfreeOrder);
      return NextResponse.json(
        { error: 'Payment gateway error. Please try again.' },
        { status: 502 }
      );
    }

    /* ─── Store order record ─── */
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    await crmDb.collection('crm_billing_orders').insertOne({
      orderId,
      tenantSlug: tenantSlug || null,
      email: email.trim().toLowerCase(),
      plan,
      billing,
      amount,
      currency: 'INR',
      cfOrderId: cashfreeOrder.cf_order_id,
      paymentSessionId: cashfreeOrder.payment_session_id,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cashfreeOrder.payment_session_id,
      amount,
      plan: planInfo.name,
    });
  } catch (err: any) {
    console.error('CRM Billing Checkout Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create payment. Please try again.' },
      { status: 500 }
    );
  }
}
