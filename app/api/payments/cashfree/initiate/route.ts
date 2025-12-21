import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  cashfreeCreateOrder,
  getCashfreeEnv,
  getCashfreeReturnUrl,
  getCashfreeSdkUrl,
  getCashfreeWebhookUrl,
} from '@/lib/payments/cashfree';

// Cashfree payment initiation
// - Verifies user JWT
// - Creates an Order in MongoDB (paymentStatus=pending)
// - Creates a Cashfree order and returns payment_session_id for Cashfree JS checkout

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    const decoded = token ? verifyToken(token) : null;

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as any;
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { amount, productInfo, firstName, lastName, email, phone, city } = body;

    if (!amount || !productInfo || !firstName || !email || !phone || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const currency = String(body.currency || 'INR');

    await connectDB();

    // Create internal Order first.
    const order = new Order({
      userId: decoded.userId,
      items: body.items || [
        {
          name: productInfo,
          price: amountNum,
          quantity: 1,
        },
      ],
      total: amountNum,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cashfree',
      shippingAddress: {
        firstName: String(firstName),
        lastName: lastName ? String(lastName) : '',
        email: String(email),
        phone: String(phone),
        city: String(city),
        address: body.address ? String(body.address) : '',
        state: body.state ? String(body.state) : '',
        zip: body.zip ? String(body.zip) : '',
      },
      clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      clientUserAgent: request.headers.get('user-agent') || undefined,
    });

    await order.save();

    // Use our Mongo order id as Cashfree order_id (must be unique).
    const cashfreeOrderId = String(order._id);

    const returnUrl = getCashfreeReturnUrl(request);
    const notifyUrl = getCashfreeWebhookUrl(request);

    // Note: Cashfree expects customer_id to be <= 50 chars in many setups.
    const customerId = String(decoded.userId).slice(-48);

    const cf = await cashfreeCreateOrder({
      order_id: cashfreeOrderId,
      order_amount: Number(amountNum.toFixed(2)),
      order_currency: currency,
      customer_details: {
        customer_id: customerId,
        customer_name: String(firstName) + (lastName ? ` ${String(lastName)}` : ''),
        customer_email: String(email),
        customer_phone: String(phone),
      },
      order_note: String(productInfo),
      order_meta: {
        // Cashfree will redirect the customer here after payment.
        // We handle verification + DB update in /api/payments/cashfree/return.
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
    });

    const paymentSessionId = (cf as any)?.payment_session_id as string | undefined;

    if (!paymentSessionId) {
      // Keep order pending, but mark failure reason so we can investigate.
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentStatus: 'failed',
            status: 'failed',
            failureReason: 'Cashfree did not return payment_session_id',
            cashfreeOrderId,
            cashfreeOrderStatus: (cf as any)?.order_status || undefined,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ error: 'Cashfree session creation failed' }, { status: 502 });
    }

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          cashfreeOrderId,
          cashfreePaymentSessionId: paymentSessionId,
          cashfreeOrderStatus: (cf as any)?.order_status || undefined,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json(
      {
        success: true,
        method: 'cashfree',
        orderId: String(order._id),
        cashfreeOrderId,
        paymentSessionId,
        env: getCashfreeEnv(),
        sdkUrl: getCashfreeSdkUrl(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate Cashfree payment';
    console.error('Cashfree initiate error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
