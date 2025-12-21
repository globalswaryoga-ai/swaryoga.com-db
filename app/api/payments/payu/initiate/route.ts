import { NextRequest, NextResponse } from 'next/server';
import {
  getPayUPaymentUrl,
  PayUParams,
  PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT,
  generatePayUHash,
} from '@/lib/payments/payu';
import { connectDB, Order } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isRateLimited } from '@/lib/rateLimit';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';

function getBaseUrl(request: NextRequest): string {
  return getRequestBaseUrl(request);
}

function isSafeRedirectTarget(value: string | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  return /^https?:\/\//i.test(trimmed);
}

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

function sanitizePhone(phone: string): string {
  // Remove any non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume India and prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  // Ensure it's 12 digits (91 + 10 digits for India) or less
  if (cleaned.length !== 12 && cleaned.length > 0) {
    console.warn('⚠️  Phone number might be invalid:', { original: phone, cleaned, length: cleaned.length });
  }
  
  return cleaned;
}

function generatePayUTxnId(): string {
  // Must be unique and <= 25 chars. Use base36 timestamp + short random.
  // PayU txnid is safest as strictly alphanumeric (avoid underscores/special chars).
  // Example: TXNkg1u2m3pab12
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `TXN${ts}${rnd}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
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

    // Protect PayU from being hit multiple times rapidly (PayU may throttle and show “Too many Requests”).
    // Enforce 1 initiation per 60s per userId+IP.
    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    // PayU may rate limit at the network/merchant level. Use an IP-based key so rapid attempts
    // from the same network (even with different accounts) are throttled before reaching PayU.
    const rateKey = `payu-init:${ip}`;

    const allowed = isRateLimited(rateKey, {
      windowMs: 60_000,
      max: 1,
    });
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many payment attempts. Please wait 60 seconds and try again.',
          retryAfterSec: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
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
        clientIp: ip,
        clientUserAgent: request.headers.get('user-agent') || '',
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

    // Validate required fields (per PayU best practices)
    const validationErrors: string[] = [];
    
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      validationErrors.push(`amount: ${subtotal} (must be > 0)`);
    }
    if (!body.productInfo || body.productInfo.trim() === '') {
      validationErrors.push('productInfo: empty or missing');
    }
    if (!body.firstName || body.firstName.trim() === '') {
      validationErrors.push('firstName: empty or missing');
    }
    if (!body.email || body.email.trim() === '') {
      validationErrors.push('email: empty or missing');
    }
    if (!body.phone || body.phone.trim() === '') {
      validationErrors.push('phone: empty or missing');
    }
    if (!body.city || body.city.trim() === '') {
      validationErrors.push('city: empty or missing');
    }

    if (validationErrors.length > 0) {
      console.error('❌ PayU validation error: Mandatory fields missing or empty:', validationErrors);
      return NextResponse.json(
        { 
          error: 'Missing or invalid required fields',
          details: validationErrors,
          hint: 'All mandatory fields must be non-empty: amount, productInfo, firstName, email, phone, city'
        },
        { status: 400 }
      );
    }

    // Validate field lengths to prevent hash/encoding issues
    const fieldValidation = {
      productInfo: { value: body.productInfo, maxLength: 100 },
      firstName: { value: body.firstName, maxLength: 50 },
      email: { value: body.email, maxLength: 100 },
      city: { value: body.city, maxLength: 50 },
    };

    const lengthErrors = Object.entries(fieldValidation)
      .filter(([_, config]) => config.value.length > config.maxLength)
      .map(([name, config]) => `${name}: ${config.value.length} chars (max ${config.maxLength})`);

    if (lengthErrors.length > 0) {
      console.error('❌ PayU field length error:', lengthErrors);
      return NextResponse.json(
        { 
          error: 'Field length validation failed',
          details: lengthErrors
        },
        { status: 400 }
      );
    }

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

    // Durable throttling: prevent repeated PayU initiations within 60s.
    // PayU can respond with “Too many Requests” if users retry rapidly; in-memory rate limits
    // are not reliable on serverless, so we also enforce a DB-backed cooldown.
    await connectDB();
    const cooldownMs = 60_000;
    const payMethod = body.country === 'india' ? 'india_payu' : 'international_payu';
    const cutoff = new Date(Date.now() - cooldownMs);
    type RecentPendingLean = { _id: unknown; createdAt?: unknown };
    const recentPending = (await Order.findOne({
      paymentStatus: 'pending',
      paymentMethod: payMethod,
      createdAt: { $gte: cutoff },
      $or: [{ userId: decoded.userId }, { clientIp: ip }],
    })
      .select({ _id: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean()) as RecentPendingLean | null;

    if (recentPending?.createdAt) {
      const createdAt = new Date(recentPending.createdAt as string | number | Date).getTime();
      const retryAfterSec = Math.max(1, Math.ceil((createdAt + cooldownMs - Date.now()) / 1000));
      return NextResponse.json(
        {
          error: 'Too many payment attempts. Please wait and try again.',
          retryAfterSec,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
          },
        }
      );
    }

    // Create an Order record so txnid is PayU-safe (<=25 chars) and callback can update it.
    // Mongoose ObjectId string length is 24.
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
      paymentMethod: payMethod,
      payuTxnId: generatePayUTxnId(),
      clientIp: ip,
      clientUserAgent: request.headers.get('user-agent') || '',
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
    const orderId = order._id.toString();
    const txnid = String(order.payuTxnId || generatePayUTxnId());

    console.log('PayU payment initiated:', {
      orderId,
      txnid,
      amount: totalAmount,
      email: body.email,
      country: body.country,
      mode: process.env.PAYU_MODE || 'TEST',
    });

    // PayU will POST the payment result to surl/furl.
    // In Next.js, pages don't handle POST reliably, so we always point surl/furl to our callback route,
    // and let the callback redirect to success/failure pages.
    const baseUrl = getBaseUrl(request) || 'http://localhost:3000';
    const callbackBase = `${baseUrl}/api/payments/payu/callback`;

    const successUrl = typeof body.successUrl === 'string' ? body.successUrl : null;
    const failureUrl = typeof body.failureUrl === 'string' ? body.failureUrl : null;
    const successTarget = successUrl && isSafeRedirectTarget(successUrl) ? successUrl : '/payment-successful';
    const failureTarget = failureUrl && isSafeRedirectTarget(failureUrl) ? failureUrl : '/payment-failed';
    const callbackUrl = `${callbackBase}?success=${encodeURIComponent(successTarget)}&failure=${encodeURIComponent(failureTarget)}`;

    // Prepare PayU parameters
    const payuParams: PayUParams & { service_provider: string } = {
      key: PAYU_MERCHANT_KEY,
      txnid,
      amount: totalAmount.toFixed(2),
      productinfo: sanitizePayUField(body.productInfo),
      firstname: sanitizePayUField(body.firstName),
      email: sanitizePayUField(body.email),
      phone: sanitizePhone(body.phone), // ← Enhanced phone sanitization
      address1: sanitizePayUField(body.address || ''),
      city: sanitizePayUField(body.city),
      state: sanitizePayUField(body.state || ''),
      zipcode: sanitizePayUField(body.zip || ''),
      surl: callbackUrl,
      furl: callbackUrl,
      service_provider: 'payu_paisa'
    };

    // Generate hash
    const hash = generatePayUHash(payuParams);

    // Log complete request for debugging 403 errors
    console.log('📤 COMPLETE PayU Request:', {
      endpoint: getPayUPaymentUrl(),
      method: 'POST',
      params: {
        key: payuParams.key?.substring(0, 3) + '***',
        txnid: payuParams.txnid,
        amount: payuParams.amount,
        productinfo: payuParams.productinfo?.substring(0, 20),
        firstname: payuParams.firstname,
        email: payuParams.email?.substring(0, 5) + '***',
        phone: payuParams.phone,
        city: payuParams.city,
        hash: hash?.substring(0, 20) + '***',
        service_provider: payuParams.service_provider
      }
    });

    // Return payment form data
    return NextResponse.json({
      success: true,
      orderId,
      country: body.country,
      paymentUrl: getPayUPaymentUrl(),
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
