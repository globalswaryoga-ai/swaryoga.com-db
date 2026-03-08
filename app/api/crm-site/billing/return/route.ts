import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { cashfreeGetOrder } from '@/lib/payments/cashfree';

/**
 * GET /api/crm-site/billing/return
 *
 * Cashfree redirects here after CRM subscription payment.
 * Verifies payment status and redirects to appropriate page.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const orderId =
      url.searchParams.get('order_id') ||
      url.searchParams.get('orderId') ||
      url.searchParams.get('cf_order_id') ||
      '';

    if (!orderId) {
      return NextResponse.redirect(new URL('/crm-site/billing/failed?error=missing_order', url.origin));
    }

    // Only process CRM billing orders
    if (!orderId.startsWith('CRM-')) {
      // Not a CRM order, redirect to regular payment return
      return NextResponse.redirect(new URL(`/api/payments/cashfree/return?order_id=${orderId}`, url.origin));
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Find the billing order
    const billingOrder = await crmDb.collection('crm_billing_orders').findOne({ orderId });
    if (!billingOrder) {
      return NextResponse.redirect(new URL('/crm-site/billing/failed?error=order_not_found', url.origin));
    }

    // Get payment status from Cashfree
    const cfOrder = await cashfreeGetOrder(orderId);
    const cfStatus = String((cfOrder as any)?.order_status || '').toUpperCase();

    // Update order status
    await crmDb.collection('crm_billing_orders').updateOne(
      { orderId },
      {
        $set: {
          cfStatus,
          returnProcessedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (cfStatus === 'PAID') {
      // Success - redirect to billing success page
      const successUrl = new URL('/crm-site/billing/success', url.origin);
      successUrl.searchParams.set('plan', billingOrder.plan);
      successUrl.searchParams.set('orderId', orderId);
      return NextResponse.redirect(successUrl);
    } else if (cfStatus === 'PENDING' || cfStatus === 'ACTIVE') {
      // Payment pending - redirect to pending page
      const pendingUrl = new URL('/crm-site/billing/pending', url.origin);
      pendingUrl.searchParams.set('orderId', orderId);
      return NextResponse.redirect(pendingUrl);
    } else {
      // Failed - redirect to failed page
      const failedUrl = new URL('/crm-site/billing/failed', url.origin);
      failedUrl.searchParams.set('orderId', orderId);
      failedUrl.searchParams.set('status', cfStatus);
      return NextResponse.redirect(failedUrl);
    }
  } catch (err: any) {
    console.error('CRM Billing Return Error:', err);
    return NextResponse.redirect(new URL('/crm-site/billing/failed?error=server_error', request.url));
  }
}
