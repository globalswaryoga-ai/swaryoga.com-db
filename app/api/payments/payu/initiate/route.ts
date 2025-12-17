import { NextRequest, NextResponse } from 'next/server';
import { PAYU_BASE_URL, PayUParams, PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, generatePayUHash } from '@/lib/payments/payu';
import { connectDB, Order } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

interface PaymentRequest {
  amount: number;
  productInfo: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  // Optional: server will create a Mongo Order and use its _id as txnid.
  orderId?: string;
  // Deprecated: userId is derived from the Authorization header token.
  userId?: string;
  items?: Array<{
    kind?: 'workshop' | 'product';
    productId?: string;
    name: string;
    price: number;
    quantity: number;
    workshopSlug?: string;
    scheduleId?: string;
    mode?: string;
    language?: string;
    currency?: string;
  }>;
  successUrl: string;
  failureUrl: string;
  currency?: string;
}

function sanitizePayUField(value: unknown): string {
  if (value == null) return '';
  return String(value).replace(/\|/g, ' ').trim();
}

// POST endpoint to initiate payment
export async function POST(request: NextRequest) {
  try {
    // Enforce authentication: no payment initiation without signup/signin.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    const decoded = token ? verifyToken(token) : null;
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PaymentRequest = await request.json();

    const amount = Number(body.amount);

    // Validate required fields
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !body.productInfo ||
      !body.firstName ||
      !body.email ||
      !body.phone ||
      !body.successUrl ||
      !body.failureUrl
    ) {
      console.error('PayU validation error: Missing or invalid required fields', {
        amount: Number.isFinite(amount),
        productInfo: !!body.productInfo,
        firstName: !!body.firstName,
        email: !!body.email,
        phone: !!body.phone,
        successUrl: !!body.successUrl,
        failureUrl: !!body.failureUrl,
      });
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Validate PayU credentials
    if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
      console.error('PayU credentials not configured:', {
        hasKey: !!PAYU_MERCHANT_KEY,
        hasSalt: !!PAYU_MERCHANT_SALT,
        mode: process.env.PAYU_MODE || 'TEST',
      });
      return NextResponse.json(
        { 
          error: 'PayU credentials not configured. Please set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in environment variables.',
          details: 'Contact admin to configure payment gateway'
        },
        { status: 500 }
      );
    }

    // Create an Order record so txnid is PayU-safe (<=25 chars) and callback can update it.
    // Mongoose ObjectId string length is 24.
    await connectDB();
    const order = new Order({
      userId: decoded.userId,
      items: (body.items || []).map((item) => ({
        kind: item.kind || undefined,
        productId: item.productId || '',
        name: item.name,
        price: item.price,
        quantity: item.quantity,

        workshopSlug: item.workshopSlug || undefined,
        scheduleId: item.scheduleId || undefined,
        mode: item.mode || undefined,
        language: item.language || undefined,
        currency: item.currency || body.currency || 'INR',
      })),
      total: amount,
      currency: body.currency || 'INR',
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress: {
        firstName: sanitizePayUField(body.firstName),
        lastName: sanitizePayUField(body.lastName),
        email: sanitizePayUField(body.email),
        phone: sanitizePayUField(body.phone),
        address: sanitizePayUField(body.address),
        city: sanitizePayUField(body.city),
        state: sanitizePayUField(body.state),
        zip: sanitizePayUField(body.zip),
      },
    });
    await order.save();
    const txnid = order._id.toString();

    console.log('PayU payment initiated:', {
      txnid,
      amount,
      email: body.email,
      mode: process.env.PAYU_MODE || 'TEST',
    });

    // Prepare PayU parameters
    const payuParams: PayUParams & { service_provider: string } = {
      key: PAYU_MERCHANT_KEY,
      txnid,
      amount: amount.toFixed(2),
      productinfo: sanitizePayUField(body.productInfo),
      firstname: sanitizePayUField(body.firstName),
      email: sanitizePayUField(body.email),
      phone: sanitizePayUField(body.phone),
      address1: sanitizePayUField(body.address),
      city: sanitizePayUField(body.city),
      state: sanitizePayUField(body.state),
      zipcode: sanitizePayUField(body.zip),
      surl: body.successUrl, // Success URL
      furl: body.failureUrl, // Failure URL
      service_provider: 'payu_paisa'
    };

    // Generate hash
    const hash = generatePayUHash(payuParams);

    // Return payment form data
    return NextResponse.json({
      success: true,
      orderId: txnid,
      paymentUrl: `${PAYU_BASE_URL}/_payment`,
      params: {
        ...payuParams,
        hash
      }
    });
  } catch (error) {
    console.error('Error initiating PayU payment:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
