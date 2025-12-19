import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import {
  generatePayUHash,
  getPayUPaymentUrl,
  PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT,
  PayUParams
} from '@/lib/payments/payu';

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) return configured.trim().replace(/\/$/, '');

  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`.replace(/\/$/, '');

  return '';
}

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
const PAYPAL_API_BASE =
  PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const NEPAL_QR_LINK = process.env.NEPAL_QR_LINK || '';

type PaymentMethod = 'payu' | 'paypal' | 'nepal_qr';

interface UnifiedPaymentRequest {
  method?: PaymentMethod;
  amount: number;
  currency: string;
  orderId: string;
  productInfo: string;
  successUrl: string;
  failureUrl: string;
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  qrMessage?: string;
}

interface PayPalOrderResponse {
  id: string;
  links?: Array<{ rel?: string; href?: string }>;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body: UnifiedPaymentRequest = await request.json();
    const method: PaymentMethod = body.method || 'payu';

    if (!body.amount || !body.orderId || !body.productInfo) {
      return NextResponse.json(
        { error: 'amount, orderId, and productInfo are required' },
        { status: 400 }
      );
    }

    switch (method) {
      case 'payu':
        return await createPayUResponse(request, body);
      case 'paypal':
        return await createPayPalResponse(body);
      case 'nepal_qr':
        return createNepalQRResponse(body);
      default:
        return NextResponse.json(
          { error: `Unsupported payment method ${method}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare payment' },
      { status: 500 }
    );
  }
}

async function createPayUResponse(request: NextRequest, body: UnifiedPaymentRequest) {
  if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
    return NextResponse.json(
      { error: 'PayU credentials not configured' },
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl(request) || 'http://localhost:3000';
  const callbackBase = `${baseUrl}/api/payments/payu/callback`;
  const successTarget = body.successUrl || '/payment-successful';
  const failureTarget = body.failureUrl || '/payment-failed';
  const callbackUrl = `${callbackBase}?success=${encodeURIComponent(successTarget)}&failure=${encodeURIComponent(failureTarget)}`;

  const payuParams: PayUParams & { service_provider: string } = {
    key: PAYU_MERCHANT_KEY,
    txnid: body.orderId,
    amount: body.amount.toFixed(2),
    productinfo: body.productInfo,
    firstname: body.customerName || 'Guest',
    email: body.email || 'noreply@' + (process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'example.com'),
    phone: body.phone || '0000000000',
    address1: body.address || '',
    city: body.city || '',
    state: body.state || '',
    zipcode: body.zip || '',
    surl: callbackUrl,
    furl: callbackUrl,
    service_provider: 'payu_paisa'
  };

  const hash = generatePayUHash(payuParams);

  return NextResponse.json({
    success: true,
    method: 'payu',
    paymentUrl: getPayUPaymentUrl(),
    params: {
      ...payuParams,
      hash
    }
  });
}

async function createPayPalResponse(body: UnifiedPaymentRequest) {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'PayPal client credentials missing' },
      { status: 500 }
    );
  }

  const accessToken = await fetchPayPalAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Unable to retrieve PayPal access token' },
      { status: 502 }
    );
  }

  const order = await createPayPalOrder(accessToken, body);

  if (!order) {
    return NextResponse.json(
      { error: 'PayPal order creation failed' },
      { status: 502 }
    );
  }

  const approvalLink = order.links?.find((link) => link.rel === 'approve')?.href;

  return NextResponse.json({
    success: true,
    method: 'paypal',
    orderId: order.id,
    approvalUrl: approvalLink,
    raw: order
  });
}

function createNepalQRResponse(body: UnifiedPaymentRequest) {
  if (!NEPAL_QR_LINK) {
    return NextResponse.json(
      { error: 'Nepal QR link not configured' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    amount: body.amount.toFixed(2),
    currency: body.currency || 'NPR'
  });

  if (body.qrMessage) {
    params.set('note', body.qrMessage);
  }

  const separator = NEPAL_QR_LINK.includes('?') ? '&' : '?';
  const qrLink = `${NEPAL_QR_LINK}${separator}${params.toString()}`;

  return NextResponse.json({
    success: true,
    method: 'nepal_qr',
    qrLink,
    amount: body.amount,
    currency: body.currency || 'NPR'
  });
}

async function fetchPayPalAccessToken(): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials'
  });

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    console.error('PayPal token error', await response.text());
    return null;
  }

  const json = await response.json();
  return json.access_token || null;
}

async function createPayPalOrder(accessToken: string, body: UnifiedPaymentRequest): Promise<PayPalOrderResponse | null> {
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: body.orderId,
          description: body.productInfo,
          amount: {
            currency_code: body.currency || 'USD',
            value: body.amount.toFixed(2)
          }
        }
      ],
      application_context: {
        brand_name: process.env.NEXT_PUBLIC_APP_NAME || 'Swar Yoga',
        return_url: body.successUrl,
        cancel_url: body.failureUrl
      }
    })
  });

  if (!response.ok) {
    console.error('PayPal order error', await response.text());
    return null;
  }

  return response.json();
}
