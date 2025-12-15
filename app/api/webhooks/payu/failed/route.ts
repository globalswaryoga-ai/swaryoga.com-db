import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyPayUResponseHash } from '@/lib/payments/payu';

/**
 * PayU Failed Payment Webhook Handler
 * Called by PayU when payment fails
 * Endpoint: POST /api/webhooks/payu/failed
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payuData = Object.fromEntries(formData) as Record<string, string>;

    // Log webhook receipt
    console.log('[PayU Webhook] Failed payment:', {
      txnid: payuData.txnid,
      status: payuData.status,
      error: payuData.error,
      error_Message: payuData.error_Message,
      timestamp: new Date().toISOString(),
    });

    // Verify PayU hash to ensure authenticity
    if (!verifyPayUResponseHash(payuData)) {
      console.error('[PayU Webhook] Hash verification failed for failed payment');
      return NextResponse.json(
        { error: 'Invalid hash', success: false },
        { status: 400 }
      );
    }

    await connectDB();

    const orderId = payuData.txnid;
    const transactionId = payuData.mihpayid || payuData.payuMoneyId || 'N/A';
    const email = payuData.email;
    const errorCode = payuData.error || 'unknown';
    const errorMessage = payuData.error_Message || 'Payment failed';

    // Find and update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'payment_failed',
        paymentStatus: 'failed',
        transactionId,
        paymentMethod: 'payu',
        paymentFailureDate: new Date(),
        paymentError: {
          code: errorCode,
          message: errorMessage,
          status: payuData.status,
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

    console.log('[PayU Webhook] Order marked as failed:', {
      orderId,
      status: 'payment_failed',
      errorCode,
      errorMessage,
    });

    // Send response to PayU
    return NextResponse.json(
      {
        success: true,
        message: 'Payment failure recorded',
        orderId,
        transactionId,
        errorCode,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PayU Webhook] Error processing failed payment:', error);
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
      message: 'PayU Failed Payment Webhook Endpoint',
      endpoint: '/api/webhooks/payu/failed',
      method: 'POST',
      description: 'Receives failed payment notifications from PayU',
    },
    { status: 200 }
  );
}
