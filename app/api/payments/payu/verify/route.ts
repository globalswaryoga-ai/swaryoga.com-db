import { NextRequest, NextResponse } from 'next/server';
import { PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, PAYU_MODE } from '@/lib/payments/payu';
import crypto from 'crypto';

/**
 * Verify Payment Status API
 * Query PayU for transaction status
 * 
 * Production: https://info.payu.in/merchant/postservice.php?form=2
 * Test: https://test.payu.in/merchant/postservice.php?form=2
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txnid } = body;

    if (!txnid) {
      return NextResponse.json(
        { error: 'Transaction ID (txnid) is required' },
        { status: 400 }
      );
    }

    if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
      console.error('❌ PayU credentials not configured');
      return NextResponse.json(
        { error: 'Payment verification not configured' },
        { status: 500 }
      );
    }

    // Determine endpoint based on mode
    const isProduction = PAYU_MODE === 'PRODUCTION';
    const verifyUrl = isProduction
      ? 'https://info.payu.in/merchant/postservice.php?form=2'
      : 'https://test.payu.in/merchant/postservice.php?form=2';

    console.log('🔍 Verifying payment:', { txnid, mode: PAYU_MODE, url: verifyUrl });

    // Generate hash for verification request
    // Hash = SHA512(key|command|var1|salt)
    const hashArray = [PAYU_MERCHANT_KEY, 'verify_payment', txnid, PAYU_MERCHANT_SALT];
    const hashString = hashArray.join('|');
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    // Make request to PayU verification API
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        key: PAYU_MERCHANT_KEY,
        command: 'verify_payment',
        var1: txnid,
        hash: hash,
      }).toString(),
    });

    if (!verifyResponse.ok) {
      console.error('❌ PayU verification API error:', verifyResponse.status);
      return NextResponse.json(
        { error: 'Payment verification failed', status: verifyResponse.status },
        { status: verifyResponse.status }
      );
    }

    const verifyData = await verifyResponse.text();
    
    // Parse response - PayU returns pipe-separated values
    // Format: transaction_id|txnid|amount|productinfo|firstname|email|status|udf1|...|udf10|hash|key|additional_charges|settlement_amount|...
    const parts = verifyData.split('|');
    
    if (parts.length < 8) {
      console.error('❌ Invalid PayU response format:', verifyData);
      return NextResponse.json(
        { 
          error: 'Invalid response from PayU',
          rawResponse: verifyData 
        },
        { status: 500 }
      );
    }

    const paymentStatus = {
      txnid: parts[1],
      amount: parts[2],
      productinfo: parts[3],
      firstname: parts[4],
      email: parts[5],
      status: parts[6],
      timestamp: new Date().toISOString(),
      payuMode: PAYU_MODE,
    };

    console.log('✅ Payment verified:', paymentStatus);

    return NextResponse.json({
      success: true,
      data: paymentStatus,
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const txnid = request.nextUrl.searchParams.get('txnid');
  
  if (!txnid) {
    return NextResponse.json(
      { error: 'Transaction ID (txnid) query parameter is required' },
      { status: 400 }
    );
  }

  // Forward to POST handler
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ txnid }),
    headers: { 'Content-Type': 'application/json' },
  }));
}
