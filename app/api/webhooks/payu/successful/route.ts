import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyPayUResponseHash } from '@/lib/payments/payu';

/**
 * PayU Successful Payment Webhook Handler
 * Called by PayU when payment is successful
 * Endpoint: POST /api/webhooks/payu/successful
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payuData = Object.fromEntries(formData) as Record<string, string>;

    // Log webhook receipt (non-sensitive)
    console.log('[PayU Webhook] Successful payment:', {
      txnid: payuData.txnid,
      mihpayid: payuData.mihpayid,
      status: payuData.status,
      timestamp: new Date().toISOString(),
    });

    // Verify PayU hash to ensure authenticity
    if (!verifyPayUResponseHash(payuData)) {
      console.error('[PayU Webhook] Hash verification failed for successful payment');
      return NextResponse.json(
        { error: 'Invalid hash', success: false },
        { status: 400 }
      );
    }

    await connectDB();

    const orderId = payuData.txnid;
    const transactionId = payuData.mihpayid || payuData.payuMoneyId;
    const amount = parseFloat(payuData.amount);
    const email = payuData.email;

    // Find and update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'paid',
        paymentStatus: 'completed',
        transactionId,
        paymentMethod: 'payu',
        paymentDate: new Date(),
        paymentResponse: {
          status: payuData.status,
          mihpayid: transactionId,
          amount,
          email,
          udf1: payuData.udf1,
          udf2: payuData.udf2,
        },
      },
      { new: true }
    );

    if (!order) {
      console.error('[PayU Webhook] Order not found:', orderId);
      return NextResponse.json(
        { error: 'Order not found', success: false, orderId },
        { status: 404 }
      );
    }

    console.log('[PayU Webhook] Order updated successfully:', {
      orderId,
      status: 'paid',
      amount,
    });

    // Send success response to PayU
    return NextResponse.json(
      {
        success: true,
        message: 'Payment processed successfully',
        orderId,
        transactionId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PayU Webhook] Error processing successful payment:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// Also handle GET for testing
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      message: 'PayU Successful Payment Webhook Endpoint',
      endpoint: '/api/webhooks/payu/successful',
      method: 'POST',
      description: 'Receives successful payment notifications from PayU',
    },
    { status: 200 }
  );
}
