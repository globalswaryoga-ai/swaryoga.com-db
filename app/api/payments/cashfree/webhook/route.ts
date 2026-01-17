import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { cashfreeGetOrder } from '@/lib/payments/cashfree';

// Cashfree webhook handler.
// We keep verification simple and robust:
// - accept payload
// - extract order id (best-effort)
// - fetch canonical status from Cashfree using server credentials
// - update our Order
//
// NOTE: If your Cashfree account provides webhook signatures, you should add signature verification here.

export async function GET(request: NextRequest) {
  // Cashfree dashboard “Test” may call the endpoint with GET/HEAD to validate reachability.
  // Returning 200 here helps you save the endpoint even before live events are configured.
  const url = new URL(request.url);
  return NextResponse.json(
    {
      ok: true,
      service: 'cashfree-webhook',
      hint: 'Send POST webhooks to this endpoint',
      // NOTE: Configure Cashfree order_meta.return_url with placeholders, e.g.
      //   https://<domain>/api/payments/cashfree/return?order_id={order_id}&order_token={order_token}
      returnUrl: `${url.origin}/api/payments/cashfree/return?order_id={order_id}&order_token={order_token}`,
    },
    { status: 200 }
  );
}

export async function HEAD() {
  // Some providers use HEAD as a reachability check.
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    // Be tolerant of provider “test” payloads.
    const raw = await request.text().catch(() => '');
    if (!raw) {
      return NextResponse.json({ success: true, ignored: true, reason: 'empty-body' }, { status: 200 });
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ success: true, ignored: true, reason: 'invalid-json' }, { status: 200 });
    }

    const cashfreeOrderId =
      String(body?.data?.order?.order_id || body?.data?.order_id || body?.order_id || body?.orderId || '').trim();

    if (!cashfreeOrderId) {
      return NextResponse.json({ success: true, ignored: true, reason: 'missing-order_id' }, { status: 200 });
    }

    await connectDB();

    const order = await Order.findOne({ cashfreeOrderId });
    if (!order) {
      // Don't fail webhook retries forever.
      return NextResponse.json({ success: true, ignored: true }, { status: 200 });
    }

    const cf = await cashfreeGetOrder(cashfreeOrderId);
    const cfStatus = String((cf as any)?.order_status || (cf as any)?.orderStatus || '').toUpperCase();

    let paymentStatus: 'pending' | 'completed' | 'failed' = 'pending';
    if (cfStatus === 'PAID') paymentStatus = 'completed';
    else if (cfStatus === 'FAILED' || cfStatus === 'CANCELLED' || cfStatus === 'EXPIRED') paymentStatus = 'failed';

    order.paymentMethod = 'cashfree';
    order.cashfreeOrderStatus = cfStatus || order.cashfreeOrderStatus;
    order.paymentStatus = paymentStatus;
    order.status = paymentStatus === 'completed' ? 'completed' : paymentStatus === 'failed' ? 'failed' : 'pending';
    order.updatedAt = new Date();

    await order.save();

    // ✅ If payment succeeded, create customer lead automatically
    if (paymentStatus === 'completed') {
      try {
        const shippingAddress = (order as any).shippingAddress || {};
        const items = (order as any).items || [];
        
        // Extract workshop info from order items
        const workshopName = items[0]?.name || 'Workshop';
        
        // Call create-customer-lead endpoint
        const leadResponse = await fetch(
          `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/payments/create-customer-lead`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order._id.toString(),
              userId: (order as any).userId,
              firstName: shippingAddress.firstName || 'Customer',
              lastName: shippingAddress.lastName || '',
              email: shippingAddress.email || order.email,
              phone: shippingAddress.phone || order.phone,
              workshopName,
              amount: order.total,
              paymentMethod: 'cashfree',
              transactionId: cfStatus,
              mode: shippingAddress.mode || '',
              language: shippingAddress.language || '',
            }),
          }
        );

        const leadData = await leadResponse.json().catch(() => null);
        if (leadData?.success) {
          console.log(`✅ Customer lead created: ${leadData.leadNumber}`);
        }
      } catch (leadError) {
        console.error('⚠️ Failed to create customer lead:', leadError);
        // Don't fail webhook if lead creation fails
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cashfree webhook failed';
    console.error('Cashfree webhook error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
