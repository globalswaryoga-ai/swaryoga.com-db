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
  const startTime = Date.now();
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    const decoded = token ? verifyToken(token) : null;

    // Allow unauthenticated requests (public checkout)
    // If authenticated, use userId; otherwise generate placeholder for new customer
    const userId = decoded?.userId || 'guest-' + Date.now();

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

    // Create order with all fields including Cashfree placeholders
    // We'll update in place instead of saving twice
    const cashfreeOrderId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);

    const returnUrl = getCashfreeReturnUrl(request);
    const notifyUrl = getCashfreeWebhookUrl(request);
    const customerId = String(userId).slice(-48);

    // Call Cashfree API first (in parallel with DB write)
    const cfPromise = cashfreeCreateOrder({
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
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
    });

    // Create and save Order in DB (in parallel)
    const order = new Order({
      userId: userId,
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
      cashfreeOrderId: cashfreeOrderId,
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

    // Wait for both operations in parallel
    const [cf] = await Promise.all([cfPromise, order.save()]);

    const paymentSessionId = (cf as any)?.payment_session_id as string | undefined;

    if (!paymentSessionId) {
      // Update order to mark failure
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentStatus: 'failed',
            status: 'failed',
            failureReason: 'Cashfree did not return payment_session_id',
            cashfreeOrderStatus: (cf as any)?.order_status || undefined,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ error: 'Cashfree session creation failed' }, { status: 502 });
    }

    // Update order with Cashfree details
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          cashfreePaymentSessionId: paymentSessionId,
          cashfreeOrderStatus: (cf as any)?.order_status || undefined,
          updatedAt: new Date(),
        },
      }
    );

    const totalTime = Date.now() - startTime;
    if (totalTime > 3000) {
      console.warn(`⚠️ Cashfree initiate took ${totalTime}ms (slower than expected)`);
    }

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
    const totalTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Failed to initiate Cashfree payment';
    console.error(`❌ Cashfree initiate error after ${totalTime}ms:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
