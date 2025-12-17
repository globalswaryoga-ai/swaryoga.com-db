import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order, WorkshopSeatInventory, WorkshopSchedule } from '@/lib/db';
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
    const order = await Order.findById(orderId);

    if (!order) {
      console.error('[PayU Webhook] Order not found:', orderId);
      return NextResponse.json(
        { error: 'Order not found', success: false, orderId },
        { status: 404 }
      );
    }

    const wasCompleted = order.paymentStatus === 'completed' || order.status === 'completed';

    order.status = 'paid';
    order.paymentStatus = 'completed';
    order.transactionId = transactionId;
    order.paymentMethod = 'payu';
    (order as any).paymentDate = new Date();
    (order as any).paymentResponse = {
      status: payuData.status,
      mihpayid: transactionId,
      amount,
      email,
      udf1: payuData.udf1,
      udf2: payuData.udf2,
    };

    await order.save();

    // Decrement seats exactly once when payment becomes successful.
    if (!wasCompleted && !order.seatInventoryAdjusted) {
      const items = Array.isArray(order.items) ? (order.items as any[]) : [];

      for (const item of items) {
        const workshopSlug = String(item.workshopSlug || '').trim();
        const scheduleId = String(item.scheduleId || '').trim();
        const qty = Number(item.quantity || 0);
        if (!workshopSlug || !scheduleId || !Number.isFinite(qty) || qty <= 0) continue;

        let seatsTotal: number | undefined;

        const existingInv = (await WorkshopSeatInventory.findOne({ workshopSlug, scheduleId })
          .select({ seatsTotal: 1 })
          .lean()) as any;
        const invSeatsTotal = Number(existingInv?.seatsTotal);
        if (Number.isFinite(invSeatsTotal) && invSeatsTotal > 0) {
          seatsTotal = invSeatsTotal;
        }

        if (!seatsTotal) {
          const scheduleDoc = (await WorkshopSchedule.findById(scheduleId)
            .select({ seatsTotal: 1, workshopSlug: 1 })
            .lean()) as any;
          if (scheduleDoc && String(scheduleDoc?.workshopSlug || '') === workshopSlug) {
            const n = Number(scheduleDoc?.seatsTotal);
            if (Number.isFinite(n) && n > 0) seatsTotal = n;
          }
        }

        if (!seatsTotal || !Number.isFinite(seatsTotal) || seatsTotal <= 0) continue;

        await WorkshopSeatInventory.updateOne(
          { workshopSlug, scheduleId },
          {
            $setOnInsert: {
              workshopSlug,
              scheduleId,
              seatsTotal,
              seatsRemaining: seatsTotal,
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );

        await WorkshopSeatInventory.updateOne(
          { workshopSlug, scheduleId, seatsRemaining: { $gte: qty } },
          { $inc: { seatsRemaining: -qty }, $set: { updatedAt: new Date() } }
        );
      }

      order.seatInventoryAdjusted = true;
      await order.save();
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
