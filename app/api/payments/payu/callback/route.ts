import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyPayUResponseHash } from '@/lib/payments/payu';

// Handle PayU success callback (POST)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract PayU response data
  const payuData = Object.fromEntries(formData) as Record<string, string>;

    // Avoid logging full payment payloads unless explicitly debugging.
    if (process.env.DEBUG_PAYU === '1') {
      console.log('PayU Response:', payuData);
    }

    // Verify hash
    if (!verifyPayUResponseHash(payuData)) {
      console.error('Invalid PayU hash');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    await connectDB();

    // Extract relevant data
    const orderId = payuData.txnid;
    const transactionId = payuData.payuMoneyId;
    const status = payuData.status; // 'success' or 'failed'
    const amount = parseFloat(payuData.amount);
    const email = payuData.email;

    // Find and update order
    const order = await Order.findOne({ _id: orderId });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order with payment status
    if (status === 'success') {
      order.status = 'completed';
      order.paymentStatus = 'completed';
      order.transactionId = transactionId;
      order.paymentMethod = 'payu';
    } else if (status === 'failed') {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.failureReason = payuData.error_Message || 'Payment failed';
    } else if (status === 'pending') {
      order.status = 'pending';
      order.paymentStatus = 'pending';
      order.transactionId = transactionId;
    }

    await order.save();

    // Log payment transaction
    if (process.env.DEBUG_PAYU === '1') {
      console.log(`Payment ${status}:`, {
        orderId,
        transactionId,
        amount,
        email,
      });
    }

    // Redirect to appropriate page based on status
    if (status === 'success') {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/thankyou?orderId=${orderId}`);
    } else {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/checkout?error=Payment failed. Please try again.&orderId=${orderId}`);
    }

  } catch (error) {
    console.error('Error processing PayU callback:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Handle PayU verification (GET - for testing)
export async function GET() {
  return NextResponse.json({
    message: 'PayU callback endpoint is active',
    mode: process.env.PAYU_MODE || 'TEST'
  });
}
