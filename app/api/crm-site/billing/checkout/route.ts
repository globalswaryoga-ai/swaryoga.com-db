import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { cashfreeCreateOrder } from '@/lib/payments/cashfree';

/**
 * POST /api/crm-site/billing/checkout
 *
 * Creates a Cashfree payment order for a CRM plan subscription.
 * Called after signup for paid plans (Basic, Starter, Growth, Professional).
 *
 * Expects: { plan, billing, storageGB, paymentMethod, enableAutopay, upiId, email, name, phone, tenantSlug, businessName, gstNumber, billingAddress }
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

const PLAN_PRICES: Record<string, { quarterly: number; halfyearly: number; annual: number; name: string }> = {
  free:         { quarterly: 0,     halfyearly: 0,     annual: 0,      name: 'Free Plan' },
  basic:        { quarterly: 2697,  halfyearly: 5094,  annual: 9590,   name: 'Basic Plan' },
  starter:      { quarterly: 5397,  halfyearly: 10194, annual: 19190,  name: 'Starter Plan' },
  growth:       { quarterly: 13497, halfyearly: 25494, annual: 47990,  name: 'Growth Plan' },
  professional: { quarterly: 26997, halfyearly: 50994, annual: 95990,  name: 'Professional Plan' },
};

// Storage pricing: Free=₹30/500MB min, Basic=₹50/1GB min, Starter+=₹35/GB
const STORAGE_PRICING: Record<string, { pricePerGB: number; minPrice: number }> = {
  free:         { pricePerGB: 60,  minPrice: 30 },
  basic:        { pricePerGB: 50,  minPrice: 50 },
  starter:      { pricePerGB: 35,  minPrice: 35 },
  growth:       { pricePerGB: 35,  minPrice: 35 },
  professional: { pricePerGB: 35,  minPrice: 35 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      plan, 
      billing = 'quarterly', 
      storageGB = 1,
      paymentMethod = 'upi',
      enableAutopay = false,
      upiId,
      email, 
      name, 
      phone, 
      tenantSlug,
      businessName,
      gstNumber,
      billingAddress,
    } = body;

    /* ─── Validate ─── */
    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }
    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Email and name are required.' }, { status: 400 });
    }

    const planInfo = PLAN_PRICES[plan];
    const storagePricing = STORAGE_PRICING[plan] || STORAGE_PRICING.starter;
    
    // Calculate plan cost
    const planAmount = billing === 'annual' ? planInfo.annual : billing === 'halfyearly' ? planInfo.halfyearly : planInfo.quarterly;
    
    // Calculate storage cost (minimum applies)
    const storageCost = Math.max(storageGB * storagePricing.pricePerGB, storagePricing.minPrice);
    
    // Subtotal
    const subtotal = planAmount + storageCost;
    
    // GST 18%
    const gst = Math.ceil(subtotal * 0.18);
    
    // Total amount
    const amount = subtotal + gst;

    // Free plan with 0 total should not go through payment
    if (plan === 'free' && amount === 0) {
      return NextResponse.json({ error: 'Free plan does not require payment.' }, { status: 400 });
    }

    await connectDB();

    /* ─── Create order ID ─── */
    const orderId = `CRM-${tenantSlug || 'new'}-${plan}-${Date.now()}`.replace(/[^a-zA-Z0-9-_]/g, '');

    /* ─── Create Cashfree order ─── */
    const billingPeriod = billing === 'annual' ? 'Annual' : billing === 'halfyearly' ? 'Half-Yearly' : 'Quarterly';
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
      order_note: `${planInfo.name} (${billingPeriod}) + ${storageGB}GB storage — Total ₹${amount} (incl. GST)`,
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
      storageGB,
      paymentMethod,
      enableAutopay,
      upiId: upiId || null,
      businessName: businessName || null,
      gstNumber: gstNumber || null,
      billingAddress: billingAddress || null,
      planAmount,
      storageCost,
      subtotal,
      gst,
      amount,
      currency: 'INR',
      cfOrderId: cashfreeOrder.cf_order_id,
      paymentSessionId: cashfreeOrder.payment_session_id,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    // Note: Payment confirmation emails are sent via webhook after successful payment
    // See: /api/crm-site/billing/webhook (sendPaymentConfirmationEmail)

    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cashfreeOrder.payment_session_id,
      amount,
      planAmount,
      storageCost,
      gst,
      storageGB,
      plan: planInfo.name,
      billing,
    });
  } catch (err: any) {
    console.error('CRM Billing Checkout Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create payment. Please try again.' },
      { status: 500 }
    );
  }
}
