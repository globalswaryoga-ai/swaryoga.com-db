import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order, WorkshopSeatInventory } from '@/lib/db';
import { PAYU_MERCHANT_SALT, verifyPayUHash } from '@/lib/payments/payu';
import { notifyPaymentConfirmation } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract PayU response fields
    const txnid = formData.get('txnid') as string;
    const amount = formData.get('amount') as string;
    const status = formData.get('status') as string;
    const hash = formData.get('hash') as string;

    console.log('📥 PayU Callback:', { txnid, amount, status, hash: hash?.substring(0, 20) });

    if (!txnid || !amount || !status || !hash) {
      console.error('❌ Missing callback fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify hash
    const hashValid = verifyPayUHash(txnid, amount, status, hash);
    if (!hashValid) {
      console.error('❌ Hash verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find order
    const order = await Order.findOne({ payuTxnId: txnid });
    if (!order) {
      console.error('❌ Order not found:', txnid);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order based on payment status
    if (status === 'success') {
      order.paymentStatus = 'completed';
      order.status = 'processing';

      // Decrement seat inventory if this is a workshop order
      if (order.items && order.items.length > 0 && !order.seatInventoryAdjusted) {
        for (const item of order.items) {
          if (item.workshopSlug && item.scheduleId) {
            await WorkshopSeatInventory.findOneAndUpdate(
              { workshopSlug: item.workshopSlug, scheduleId: item.scheduleId },
              {
                $inc: { seatsAvailable: -1 * (item.quantity || 1) },
              },
              { upsert: true }
            );
          }
        }
        order.seatInventoryAdjusted = true;
      }

      console.log('✅ Payment successful:', txnid);

      // Fire-and-forget: Send payment confirmation email
      try {
        const shippingAddress = (order as any).shippingAddress || {};
        const customerEmail = shippingAddress.email || (order as any).email;
        const customerName = shippingAddress.firstName
          ? `${shippingAddress.firstName} ${shippingAddress.lastName || ''}`.trim()
          : 'Customer';
        const items = (order as any).items || [];
        const workshopName = items[0]?.name || 'Workshop';

        if (customerEmail) {
          notifyPaymentConfirmation(
            { name: customerName, email: customerEmail, phone: shippingAddress.phone || (order as any).phone },
            {
              orderId: order._id.toString(),
              amount: Number(amount),
              workshopName,
              paymentMethod: 'PayU',
              transactionId: txnid,
            },
          ).catch(err => console.error('[PayUCallback] Notification error:', err));
        }
      } catch (notifyErr) {
        console.error('[PayUCallback] Notification prep error:', notifyErr);
      }
    } else if (status === 'failure') {
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      console.log('❌ Payment failed:', txnid);
    } else if (status === 'pending') {
      order.paymentStatus = 'pending';
      console.log('⏳ Payment pending:', txnid);
    }

    await order.save();

    // Redirect user to success/failure page
    const redirectUrl = new URL(request.url);
    if (status === 'success') {
      redirectUrl.pathname = '/payment-successful';
      redirectUrl.searchParams.set('orderId', order._id.toString());
    } else {
      redirectUrl.pathname = '/payment-failed';
      redirectUrl.searchParams.set('reason', status);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Callback error:', error);
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'PayU callback endpoint - POST only',
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
