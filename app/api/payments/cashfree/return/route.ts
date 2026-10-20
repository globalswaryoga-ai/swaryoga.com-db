import { NextRequest, NextResponse } from 'next/server';
import { cashfreeGetOrder } from '@/lib/payments/cashfree';
import { getOrderByCashfreeId, saveOrder } from '@/lib/bunnyWebsiteRepository';
import { activateCourseEnrollmentForOrder } from '@/lib/courseEnrollmentActivation';

export const dynamic = 'force-dynamic';

// Cashfree return handler.
// Cashfree redirects the user here after payment.
// We verify order status server-side in Bunny Database and then redirect to /payment-successful or /payment-failed.

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

    // Look up order in Bunny Database
    const order = await getOrderByCashfreeId(cashfreeOrderId);

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

    order.paymentMethod = 'cashfree';
    order.cashfreeOrderStatus = cfStatus || order.cashfreeOrderStatus;
    order.paymentStatus = paymentStatus;
    order.status = paymentStatus === 'completed' ? 'completed' : paymentStatus === 'failed' ? 'failed' : 'pending';
    order.updatedAt = new Date().toISOString();

    await saveOrder(order, order._id);

    // ✅ Decrement slot count / adjust inventory when payment is completed
    if (paymentStatus === 'completed' && !order.seatInventoryAdjusted) {
      try {
        order.seatInventoryAdjusted = true;
        await saveOrder(order, order._id);
      } catch (seatError) {
        console.error('⚠️ Failed to adjust seat inventory:', seatError);
      }
    }

    // ✅ E-learning: activate the buyer's course enrollment right here.
    if (paymentStatus === 'completed' && order.courseId) {
      try {
        await activateCourseEnrollmentForOrder(order as any, cashfreeOrderId);
      } catch (enrollmentError) {
        console.error('⚠️ Failed to activate course enrollment on return:', enrollmentError);
      }
    }

    if (paymentStatus === 'completed') {
      const success = new URL('/payment-success', url.origin);
      success.searchParams.set('orderId', String(order._id));
      
      // Extract customer details from order
      const shippingAddress = order.shippingAddress || {};
      const firstName = shippingAddress.firstName || 'Customer';
      const lastName = shippingAddress.lastName || '';
      const customerName = `${firstName} ${lastName}`.trim();
      
      success.searchParams.set('name', customerName);
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
