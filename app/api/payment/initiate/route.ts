import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Currency exchange rates
const CURRENCY_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  CAD: 0.017,
  AUD: 0.018,
  JPY: 1.8,
  SGD: 0.016,
  MUR: 0.54,
  NPR: 1.58,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txnid, amount, productinfo, firstname, email, phone, currency, workshopId, quantity, formData } = body;

    // Validate required fields
    if (!txnid || !amount || !productinfo || !firstname || !email || !phone) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Get PayU credentials from environment
    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const merchantSalt = process.env.PAYU_MERCHANT_SALT;
    const payuMode = process.env.PAYU_MODE || 'PRODUCTION';

    if (!merchantKey || !merchantSalt) {
      console.error('PayU credentials missing');
      return NextResponse.json({ message: 'Payment configuration error' }, { status: 500 });
    }

    // For Nepal QR, we return a dummy URL (to be replaced with actual QR endpoint)
    if (currency === 'NPR') {
      return NextResponse.json({
        success: true,
        message: 'Nepal payment - QR code payment method',
        paymentUrl: '/payment-successful?status=pending&currency=NPR',
      });
    }

    // Generate hash for PayU
    const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).hexdigest();

    // PayU endpoint
    const payuEndpoint = payuMode === 'PRODUCTION'
      ? 'https://secure.payu.in/_xclick'
      : 'https://test.payumoney.com/_xclick';

    // Prepare PayU form data
    const payuData = new URLSearchParams({
      key: merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      hash,
      surl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-successful`,
      furl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-failed`,
      curl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/cancel`,
      service_provider: 'payu_paisa',
      // Additional fields
      udf1: workshopId,
      udf2: quantity.toString(),
      udf3: currency,
      udf4: JSON.stringify(formData),
    });

    return NextResponse.json({
      success: true,
      paymentUrl: `${payuEndpoint}?${payuData.toString()}`,
      txnid,
      amount,
      currency,
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { message: 'Payment initiation failed', error: String(error) },
      { status: 500 }
    );
  }
}
