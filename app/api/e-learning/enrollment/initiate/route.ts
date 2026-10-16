import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCourseById } from '@/lib/bunnyCourseRepository';
import { saveOrder } from '@/lib/bunnyWebsiteRepository';
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

    // Get course details from BunnyDB
    const course = await getCourseById(courseId);

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Calculate price
    let amount = course.pricing?.INR?.price || 0;
    const discount = (course as any).discount;
    if (discount && discount > 0) {
      amount = Math.round(amount * (1 - discount / 100));
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid course price' }, { status: 400 });
    }

    const cashfreeOrderId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
    const returnUrl = getCashfreeReturnUrl(request);
    const notifyUrl = getCashfreeWebhookUrl(request);
    const customerId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(-48);

    const courseTitle = (course.content as any)?.en?.title || course.slug || 'E-Learning Course';
    console.log(`📡 Creating Cashfree order: ${cashfreeOrderId} for course ${courseTitle}`);

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
      order_note: `E-Learning Course: ${courseTitle}`,
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
    });

    const orderId = crypto.randomUUID();
    const orderPromise = saveOrder({
      userId: userId,
      courseId: courseId,
      items: [
        {
          name: courseTitle,
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
    }, orderId);

    const [cf, order] = await Promise.all([cfPromise, orderPromise]);

    const paymentSessionId = (cf as any)?.payment_session_id as string | undefined;

    if (!paymentSessionId) {
      await saveOrder({
        id: orderId,
        paymentStatus: 'failed',
        status: 'failed',
        failureReason: 'Cashfree did not return payment_session_id',
      }, orderId);

      console.error('❌ Cashfree response missing payment_session_id');
      return NextResponse.json({ error: 'Cashfree session creation failed' }, { status: 502 });
    }

    await saveOrder({
      id: orderId,
      cashfreePaymentSessionId: paymentSessionId,
      cashfreeOrderStatus: (cf as any)?.order_status || undefined,
    }, orderId);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Course enrollment payment initiated in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      method: 'cashfree',
      orderId: order?.id || orderId,
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
