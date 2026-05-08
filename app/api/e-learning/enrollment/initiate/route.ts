import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getRecordedCourse } from '@/lib/schemas/recordedCourseSchemas';
import {
  cashfreeCreateOrder,
  getCashfreeReturnUrl,
  getCashfreeWebhookUrl,
} from '@/lib/payments/cashfree';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

    let decoded: ReturnType<typeof verifyToken> = null;
    if (token) {
      try {
        decoded = verifyToken(token);
      } catch (tokenError) {
        console.warn('⚠️ Invalid token provided');
      }
    }

    const userId = decoded?.userId || 'guest-' + Date.now();
    const body = (await request.json().catch(() => null)) as any;

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { courseId, firstName, lastName, email, phone, city, address, state, zip } = body;

    if (!courseId || !firstName || !email || !phone || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Get course details
    const RecordedCourse = getRecordedCourse();
    const course = await RecordedCourse.findById(courseId);

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Calculate price
    let amount = course.pricing?.INR?.price || 0;
    if (course.discount && course.discount > 0) {
      amount = Math.round(amount * (1 - course.discount / 100));
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid course price' }, { status: 400 });
    }

    const cashfreeOrderId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
    const returnUrl = getCashfreeReturnUrl(request);
    const notifyUrl = getCashfreeWebhookUrl(request);
    const customerId = String(userId).slice(-48);

    console.log(`📡 Creating Cashfree order: ${cashfreeOrderId} for course ${course.content?.en?.title || courseId}`);

    // Call Cashfree API and save order in parallel
    const cfPromise = cashfreeCreateOrder({
      order_id: cashfreeOrderId,
      order_amount: Number(amount.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: customerId,
        customer_name: String(firstName) + (lastName ? ` ${String(lastName)}` : ''),
        customer_email: String(email),
        customer_phone: String(phone),
      },
      order_note: `E-Learning Course: ${course.content?.en?.title || 'Unknown'}`,
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
    });

    const order = new Order({
      userId: userId,
      courseId: courseId,
      items: [
        {
          name: course.content?.en?.title || 'E-Learning Course',
          price: amount,
          quantity: 1,
        },
      ],
      total: amount,
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
        address: address ? String(address) : '',
        state: state ? String(state) : '',
        zip: zip ? String(zip) : '',
      },
      clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      clientUserAgent: request.headers.get('user-agent') || undefined,
    });

    const [cf] = await Promise.all([cfPromise, order.save()]);

    const paymentSessionId = (cf as any)?.payment_session_id as string | undefined;

    if (!paymentSessionId) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentStatus: 'failed',
            status: 'failed',
            failureReason: 'Cashfree did not return payment_session_id',
            updatedAt: new Date(),
          },
        }
      );

      console.error('❌ Cashfree response missing payment_session_id');
      return NextResponse.json({ error: 'Cashfree session creation failed' }, { status: 502 });
    }

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
    console.log(`✅ Course enrollment payment initiated in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      method: 'cashfree',
      orderId: String(order._id),
      cashfreeOrderId,
      paymentSessionId,
    }, { status: 200 });

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Failed to initiate payment';
    console.error('❌ Enrollment payment error:', message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
