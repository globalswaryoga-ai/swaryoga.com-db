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
      returnUrl: `${url.origin}/api/payments/cashfree/return`,
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cashfree webhook failed';
    console.error('Cashfree webhook error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
