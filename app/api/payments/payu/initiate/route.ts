import { NextRequest, NextResponse } from 'next/server';
import { PAYU_BASE_URL, PayUParams, PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, generatePayUHash } from '@/lib/payments/payu';

interface PaymentRequest {
  amount: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  orderId: string;
  successUrl: string;
  failureUrl: string;
}

// POST endpoint to initiate payment
export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();

    // Validate required fields
    if (!body.amount || !body.orderId || !body.email || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Prepare PayU parameters
    const payuParams: PayUParams & { service_provider: string } = {
      key: PAYU_MERCHANT_KEY,
      txnid: body.orderId,
      amount: body.amount.toFixed(2),
      productinfo: body.productInfo,
      firstname: body.firstName,
      email: body.email,
      phone: body.phone,
      address1: body.address,
      city: body.city,
      state: body.state,
      zipcode: body.zip,
      surl: body.successUrl, // Success URL
      furl: body.failureUrl, // Failure URL
      service_provider: 'payu_paisa'
    };

    // Generate hash
    const hash = generatePayUHash(payuParams);

    // Return payment form data
    return NextResponse.json({
      success: true,
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
