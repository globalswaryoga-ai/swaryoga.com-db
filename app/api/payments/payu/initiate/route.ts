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
  address?: string;
  city: string;
  state?: string;
  zip?: string;
  country: 'india' | 'international' | 'nepal';
  currency?: string;
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
  successUrl?: string;
  failureUrl?: string;
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

    // Validate country parameter
    if (!['india', 'international', 'nepal'].includes(body.country)) {
      return NextResponse.json(
        { error: 'Invalid country. Must be "india", "international", or "nepal"' },
        { status: 400 }
      );
    }

    // For Nepal: Return QR data (no PayU processing)
    if (body.country === 'nepal') {
      // Calculate total with 3.3% fee
      const subtotal = Number(body.amount);
      const chargeAmount = subtotal * 0.033;
      const totalAmount = subtotal + chargeAmount;

      // Create Order record for Nepal payment
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
          currency: item.currency || body.currency || 'NPR',
        })),
        total: totalAmount,
        currency: body.currency || 'NPR',
        status: 'pending',
        paymentStatus: 'pending_manual',
        paymentMethod: 'nepal_qr',
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

      console.log('Nepal payment order created:', {
        orderId: order._id.toString(),
        amount: totalAmount,
        email: body.email,
      });

      return NextResponse.json({
        success: true,
        orderId: order._id.toString(),
        country: 'nepal',
        paymentMethod: 'qr',
        amount: totalAmount,
        currency: body.currency || 'NPR',
        message: 'QR code displayed for manual payment'
      });
    }

    // For India and International: Calculate with 3.3% fee and process with PayU
    const subtotal = Number(body.amount);
    const chargeAmount = subtotal * 0.033;
    const totalAmount = subtotal + chargeAmount;

    // Validate required fields
    if (
      !Number.isFinite(subtotal) ||
      subtotal <= 0 ||
      !body.productInfo ||
      !body.firstName ||
      !body.email ||
      !body.phone ||
      !body.city
    ) {
      console.error('PayU validation error: Missing or invalid required fields', {
        amount: Number.isFinite(subtotal),
        productInfo: !!body.productInfo,
        firstName: !!body.firstName,
        email: !!body.email,
        phone: !!body.phone,
        city: !!body.city,
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
        currency: item.currency || body.currency || (body.country === 'india' ? 'INR' : 'USD'),
      })),
      total: totalAmount,
      currency: body.currency || (body.country === 'india' ? 'INR' : 'USD'),
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: body.country === 'india' ? 'india_payu' : 'international_payu',
      shippingAddress: {
        firstName: sanitizePayUField(body.firstName),
        lastName: sanitizePayUField(body.lastName),
        email: sanitizePayUField(body.email),
        phone: sanitizePayUField(body.phone),
        address: sanitizePayUField(body.address || ''),
        city: sanitizePayUField(body.city),
        state: sanitizePayUField(body.state || ''),
        zip: sanitizePayUField(body.zip || ''),
      },
    });
    await order.save();
    const txnid = order._id.toString();

    console.log('PayU payment initiated:', {
      txnid,
      amount: totalAmount,
      email: body.email,
      country: body.country,
      mode: process.env.PAYU_MODE || 'TEST',
    });

    // Set success/failure URLs based on environment
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const successUrl = body.successUrl || `${baseUrl}/payment-successful`;
    const failureUrl = body.failureUrl || `${baseUrl}/payment-failed`;

    // Prepare PayU parameters
    const payuParams: PayUParams & { service_provider: string } = {
      key: PAYU_MERCHANT_KEY,
      txnid,
      amount: totalAmount.toFixed(2),
      productinfo: sanitizePayUField(body.productInfo),
      firstname: sanitizePayUField(body.firstName),
      email: sanitizePayUField(body.email),
      phone: sanitizePayUField(body.phone),
      address1: sanitizePayUField(body.address || ''),
      city: sanitizePayUField(body.city),
      state: sanitizePayUField(body.state || ''),
      zipcode: sanitizePayUField(body.zip || ''),
      surl: successUrl, // Success URL
      furl: failureUrl, // Failure URL
      service_provider: 'payu_paisa'
    };

    // Generate hash
    const hash = generatePayUHash(payuParams);

    // Return payment form data
    return NextResponse.json({
      success: true,
      orderId: txnid,
      country: body.country,
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
