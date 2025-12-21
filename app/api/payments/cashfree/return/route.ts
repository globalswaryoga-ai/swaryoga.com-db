import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { cashfreeGetOrder } from '@/lib/payments/cashfree';

// Cashfree return handler.
// Cashfree redirects the user here after payment.
// We verify order status server-side and then redirect to /payment-successful or /payment-failed.

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Cashfree typically returns an order id parameter. We accept common variants.
    const cashfreeOrderId =
      url.searchParams.get('order_id') ||
      url.searchParams.get('orderId') ||
      url.searchParams.get('cf_order_id') ||
      '';

    if (!cashfreeOrderId) {
      const fail = new URL('/payment-failed', url.origin);
      fail.searchParams.set('status', 'failed');
      fail.searchParams.set('error', 'Missing Cashfree order id');
      return NextResponse.redirect(fail);
    }

    await connectDB();

    // Look up by stored cashfreeOrderId (we set it to the Mongo order _id string).
    const order = await Order.findOne({ cashfreeOrderId });

    if (!order) {
      const fail = new URL('/payment-failed', url.origin);
      fail.searchParams.set('status', 'failed');
      fail.searchParams.set('error', 'Order not found');
      fail.searchParams.set('orderId', cashfreeOrderId);
      return NextResponse.redirect(fail);
    }

    // Verify latest status from Cashfree.
    const cf = await cashfreeGetOrder(cashfreeOrderId);
    const cfStatus = String((cf as any)?.order_status || (cf as any)?.orderStatus || '').toUpperCase();

    let paymentStatus: 'pending' | 'completed' | 'failed' = 'pending';
    if (cfStatus === 'PAID') paymentStatus = 'completed';
    else if (cfStatus === 'FAILED' || cfStatus === 'CANCELLED' || cfStatus === 'EXPIRED') paymentStatus = 'failed';

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentMethod: 'cashfree',
          cashfreeOrderStatus: cfStatus || undefined,
          paymentStatus,
          status: paymentStatus === 'completed' ? 'completed' : paymentStatus === 'failed' ? 'failed' : 'pending',
          updatedAt: new Date(),
        },
      }
    );

    if (paymentStatus === 'completed') {
      const success = new URL('/payment-successful', url.origin);
      success.searchParams.set('orderId', String(order._id));
      success.searchParams.set('status', 'success');
      return NextResponse.redirect(success);
    }

    if (paymentStatus === 'failed') {
      const fail = new URL('/payment-failed', url.origin);
      fail.searchParams.set('orderId', String(order._id));
      fail.searchParams.set('status', 'failed');
      fail.searchParams.set('error', 'Payment failed');
      return NextResponse.redirect(fail);
    }

    // Pending
    const pending = new URL('/payment-failed', url.origin);
    pending.searchParams.set('orderId', String(order._id));
    pending.searchParams.set('status', 'pending');
    pending.searchParams.set('error', 'Payment pending. Please check again later.');
    return NextResponse.redirect(pending);
  } catch (error) {
    const url = new URL(request.url);
    const fail = new URL('/payment-failed', url.origin);
    fail.searchParams.set('status', 'failed');
    fail.searchParams.set('error', error instanceof Error ? error.message : 'Cashfree return handling failed');
    return NextResponse.redirect(fail);
  }
}
