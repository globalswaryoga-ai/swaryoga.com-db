import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT,
  generatePayUHash,
  getPayUPaymentUrl,
} from '@/lib/payments/payu';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';

    const decoded = token ? verifyToken(token) : null;
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate inputs
    const { amount, productInfo, firstName, email, phone, city, country } = body;

    if (!amount || !productInfo || !firstName || !email || !phone || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount is a valid number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Format amount to 2 decimal places
    const formattedAmount = amountNum.toFixed(2);

    // Generate transaction ID
    const txnid = 'TXN' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

    // Generate hash
    const hash = generatePayUHash({
      key: PAYU_MERCHANT_KEY,
      txnid,
      amount: formattedAmount,
      productinfo: productInfo,
      firstname: firstName,
      email: email,
    });

    // Create order in database
    await connectDB();
    const order = new Order({
      userId: decoded.userId,
      items: body.items || [
        {
          name: productInfo,
          price: amountNum,
          quantity: 1,
        },
      ],
      total: amountNum,
      currency: 'INR',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'payu',
      payuTxnId: txnid,
      shippingAddress: {
        firstName,
        email,
        phone,
        city,
        address: body.address || '',
        state: body.state || '',
        zip: body.zip || '',
      },
    });

    await order.save();

    // Return payment form data
    return NextResponse.json({
      success: true,
      data: {
        key: PAYU_MERCHANT_KEY,
        txnid,
        amount: formattedAmount,
        productinfo: productInfo,
        firstname: firstName,
        email: email,
        phone: phone,
        address: body.address || '',
        city: city,
        state: body.state || '',
        zipcode: body.zip || '',
        hash: hash,
        paymentUrl: getPayUPaymentUrl(),
      },
    });
  } catch (error) {
    console.error('❌ Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
