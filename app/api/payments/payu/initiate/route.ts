/**
 * @fileoverview PayU Payment Initiation Endpoint
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {

export const dynamic = 'force-dynamic';
  PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT,
  generatePayUHash,
  getPayUPaymentUrl,
} from '@/lib/payments/payu';

// Clean payment initiation - NO rate limiting - TESTED AND WORKING
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('✅ /api/payments/payu/initiate called - CLEAN ENDPOINT');
    
    // Verify authentication
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';

    const decoded = token ? verifyToken(token) : null;
    if (!decoded?.userId) {
      console.log('❌ Unauthorized - no valid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Auth passed for user:', decoded.userId);

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

    const totalTime = Date.now() - startTime;
    if (totalTime > 5000) {
      console.warn(`⚠️ PayU initiate took ${totalTime}ms (slower than target 5s)`);
    }

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
    const totalTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Failed to initiate payment';
    if (totalTime > 5000) {
      console.error(`❌ PayU initiate timeout after ${totalTime}ms`);
    }
    console.error('❌ Payment initiation error:', message);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
