import { NextRequest, NextResponse } from 'next/server';
import { PAYU_BASE_URL, PayUParams, PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, generatePayUHash } from '@/lib/payments/payu';
import { connectDB, Order } from '@/lib/db';

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
  // Optional, for logged-in orders
  userId?: string;
  items?: Array<{ productId?: string; name: string; price: number; quantity: number }>;
  successUrl: string;
  failureUrl: string;
}

function sanitizePayUField(value: unknown): string {
  if (value == null) return '';
  return String(value).replace(/\|/g, ' ').trim();
}

// POST endpoint to initiate payment
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Validate PayU credentials
    if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
      return NextResponse.json(
        { error: 'PayU credentials not configured' },
        { status: 500 }
      );
    }

    // Create an Order record so txnid is PayU-safe (<=25 chars) and callback can update it.
    // Mongoose ObjectId string length is 24.
    await connectDB();
    const order = new Order({
      // userId is optional (guest checkout)
      userId: body.userId || undefined,
      items: (body.items || []).map((item) => ({
        productId: item.productId || '',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      total: amount,
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
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
