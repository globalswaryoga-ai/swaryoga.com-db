import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyPayUResponseHash } from '@/lib/payments/payu';

/**
 * PayU Refund Webhook Handler
 * Called by PayU when a refund is initiated/processed
 * Endpoint: POST /api/webhooks/payu/refund
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payuData = Object.fromEntries(formData) as Record<string, string>;

    // Log webhook receipt
    console.log('[PayU Webhook] Refund processed:', {
      txnid: payuData.txnid,
      mihpayid: payuData.mihpayid,
      refundStatus: payuData.status,
      refundAmount: payuData.refund_amount,
      timestamp: new Date().toISOString(),
    });

    // Verify PayU hash to ensure authenticity
    if (!verifyPayUResponseHash(payuData)) {
      console.error('[PayU Webhook] Hash verification failed for refund');
      return NextResponse.json(
        { error: 'Invalid hash', success: false },
        { status: 400 }
      );
    }

    await connectDB();

    const orderId = payuData.txnid;
    const transactionId = payuData.mihpayid || payuData.payuMoneyId;
    const refundAmount = parseFloat(payuData.refund_amount || '0');
    const originalAmount = parseFloat(payuData.amount || '0');
    const refundStatus = (payuData.status || '').toLowerCase();
    const email = payuData.email;

    // Find and update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'refunded',
        paymentStatus: 'refunded',
        transactionId,
        refundDate: new Date(),
        refundDetails: {
          originalAmount,
          refundAmount,
          status: refundStatus,
          mihpayid: transactionId,
          email,
          reason: payuData.refund_reason || 'Refund processed by PayU',
          udf1: payuData.udf1,
          udf2: payuData.udf2,
        },
      },
      { new: true }
    );

    if (!order) {
      console.error('[PayU Webhook] Order not found for refund:', orderId);
      return NextResponse.json(
        { error: 'Order not found', success: false, orderId },
        { status: 404 }
      );
    }

    console.log('[PayU Webhook] Refund processed successfully:', {
      orderId,
      refundAmount,
      status: refundStatus,
    });

    // Send response to PayU
    return NextResponse.json(
      {
        success: true,
        message: 'Refund processed successfully',
        orderId,
        transactionId,
        refundAmount,
        refundStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PayU Webhook] Error processing refund:', error);
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
      message: 'PayU Refund Webhook Endpoint',
      endpoint: '/api/webhooks/payu/refund',
      method: 'POST',
      description: 'Receives refund notifications from PayU',
    },
    { status: 200 }
  );
}
