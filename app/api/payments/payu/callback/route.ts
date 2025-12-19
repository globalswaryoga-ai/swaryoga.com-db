import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order, WorkshopSeatInventory, WorkshopSchedule } from '@/lib/db';
import { verifyPayUResponseHash } from '@/lib/payments/payu';

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.trim()) return configured.trim().replace(/\/$/, '');

  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`.replace(/\/$/, '');

  return '';
}

function buildRedirectUrl(baseUrl: string, pathOrAbsoluteUrl: string, params: Record<string, string | undefined>) {
  const isAbsolute = /^https?:\/\//i.test(pathOrAbsoluteUrl);
  const url = new URL(isAbsolute ? pathOrAbsoluteUrl : `${baseUrl}${pathOrAbsoluteUrl.startsWith('/') ? '' : '/'}${pathOrAbsoluteUrl}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function pickRedirectTarget(value: string | null | undefined, fallback: string): string {
  const candidate = (value || '').toString().trim();
  if (!candidate) return fallback;
  if (candidate.startsWith('/')) return candidate;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return fallback;
}

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

    const baseUrl = getBaseUrl(request);

    const requestUrl = new URL(request.url);
    const successTarget = pickRedirectTarget(
      requestUrl.searchParams.get('success'),
      process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL || '/payment-successful'
    );
    const failureTarget = pickRedirectTarget(
      requestUrl.searchParams.get('failure'),
      process.env.NEXT_PUBLIC_PAYMENT_FAILED_URL || '/payment-failed'
    );

    // Verify hash
    if (!verifyPayUResponseHash(payuData)) {
      console.error('Invalid PayU hash');
      const redirectUrl = baseUrl
        ? buildRedirectUrl(baseUrl, failureTarget, {
            status: 'failure',
            error: 'Invalid payment signature. Please try again.',
          })
        : '/payment-failed?status=failure&error=' + encodeURIComponent('Invalid payment signature. Please try again.');
      return NextResponse.redirect(redirectUrl);
    }

    await connectDB();

    // Extract relevant data
    const payuTxnId = payuData.txnid;
    const transactionId = payuData.mihpayid || payuData.payuMoneyId;
    const status = (payuData.status || '').toLowerCase(); // 'success' | 'failure' | 'pending'
    const amount = parseFloat(payuData.amount);
    const email = payuData.email;

    // Find and update order
    // Prefer payuTxnId mapping (new). Fallback to _id for older flows.
    const order =
      (payuTxnId
        ? await Order.findOne({ payuTxnId }).exec()
        : null) ||
      (payuTxnId ? await Order.findById(payuTxnId).exec() : null);
    
    if (!order) {
      const redirectUrl = baseUrl
        ? buildRedirectUrl(baseUrl, failureTarget, {
            status: 'failure',
            txnid: payuTxnId,
            mihpayid: transactionId,
            error: 'Order not found. Please contact support.',
          })
        : '/payment-failed?status=failure&error=' + encodeURIComponent('Order not found. Please contact support.');
      return NextResponse.redirect(redirectUrl);
    }

    const orderId = String(order._id);

    const wasCompleted = order.paymentStatus === 'completed' || order.status === 'completed';

    // Update order with payment status
    if (status === 'success') {
      order.status = 'completed';
      order.paymentStatus = 'completed';
      order.transactionId = transactionId;
      order.paymentMethod = 'payu';
    } else if (status === 'failure' || status === 'failed') {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.failureReason = payuData.error_Message || 'Payment failed';
    } else if (status === 'pending') {
      order.status = 'pending';
      order.paymentStatus = 'pending';
      order.transactionId = transactionId;
    }

    await order.save();

    // Decrement seats exactly once when payment becomes successful.
    if (status === 'success' && !wasCompleted && !order.seatInventoryAdjusted) {
      const items = Array.isArray(order.items) ? (order.items as any[]) : [];

      for (const item of items) {
        const workshopSlug = String(item.workshopSlug || '').trim();
        const scheduleId = String(item.scheduleId || '').trim();
        const qty = Number(item.quantity || 0);
        if (!workshopSlug || !scheduleId || !Number.isFinite(qty) || qty <= 0) continue;

        let seatsTotal: number | undefined;

        // Prefer existing inventory (if already initialized)
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

        // Ensure inventory exists
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

        // Decrement only if enough seats remain
        await WorkshopSeatInventory.updateOne(
          { workshopSlug, scheduleId, seatsRemaining: { $gte: qty } },
          { $inc: { seatsRemaining: -qty }, $set: { updatedAt: new Date() } }
        );
      }

      order.seatInventoryAdjusted = true;
      await order.save();
    }

    // Log payment transaction
    if (process.env.DEBUG_PAYU === '1') {
      console.log(`Payment ${status}:`, {
        orderId,
        txnid: payuTxnId,
        transactionId,
        amount,
        email,
      });
    }

    // Redirect to appropriate page based on status
    if (!baseUrl) {
      return NextResponse.json({ ok: true, status });
    }

    if (status === 'success') {
      return NextResponse.redirect(
        buildRedirectUrl(baseUrl, successTarget, {
          status: 'success',
          orderId,
          txnid: payuTxnId,
          mihpayid: transactionId,
          amount: Number.isFinite(amount) ? amount.toFixed(2) : undefined,
          email,
        })
      );
    }

    // failure / failed / pending
    return NextResponse.redirect(
      buildRedirectUrl(baseUrl, failureTarget, {
        status: status || 'failure',
        orderId,
        txnid: payuTxnId,
        mihpayid: transactionId,
        amount: Number.isFinite(amount) ? amount.toFixed(2) : undefined,
        email,
        error: payuData.error_Message || (status === 'pending' ? 'Payment pending. Please check again later.' : 'Payment failed. Please try again.'),
      })
    );

  } catch (error) {
    console.error('Error processing PayU callback:', error);
    // If we can, redirect to failure page; otherwise return JSON.
    const fallback = '/payment-failed?status=failure&error=' + encodeURIComponent('Failed to process payment. Please try again.');
    return NextResponse.redirect(fallback);
  }
}

// Handle PayU verification (GET - for testing)
export async function GET() {
  return NextResponse.json({
    message: 'PayU callback endpoint is active',
    mode: process.env.PAYU_MODE || 'TEST'
  });
}
