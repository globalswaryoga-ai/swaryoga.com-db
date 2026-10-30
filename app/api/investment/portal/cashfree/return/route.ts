import { NextRequest, NextResponse } from 'next/server';
import { applyVerifiedPayment, failInvestmentPayment, getInvestmentPayment } from '@/lib/bunnyInvestmentPortal';
import { cashfreeGetOrder } from '@/lib/payments/cashfree';
import { getPublicBaseUrl } from '@/lib/investorConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/investment/portal/cashfree/return?order_id=...
 * Cashfree sends the investor back here after checkout. The payment status is
 * never taken from the URL: we ask Cashfree for the order and record the payment
 * only when Cashfree says PAID and the amount matches what we stored.
 */
export async function GET(request: NextRequest) {
  const base = getPublicBaseUrl();
  const redirect = (result: string) => NextResponse.redirect(`${base}/investment-portal/dashboard?payment=${result}`, 303);

  try {
    const orderId = new URL(request.url).searchParams.get('order_id') || '';
    const payment = orderId ? await getInvestmentPayment(orderId) : null;
    if (!payment) return redirect('invalid');

    const order = await cashfreeGetOrder(orderId);
    const paid = String(order.order_status || '').toUpperCase() === 'PAID';
    const amountMatches = Number(order.order_amount ?? NaN).toFixed(2) === payment.amount.toFixed(2);

    if (paid && amountMatches) {
      await applyVerifiedPayment({ txnid: orderId, payuId: order.cf_order_id ? String(order.cf_order_id) : undefined });
      return redirect('success');
    }

    if (!amountMatches) {
      console.warn('Cashfree order amount mismatch for', orderId);
      await failInvestmentPayment(orderId, order.cf_order_id ? String(order.cf_order_id) : undefined);
      return redirect('invalid');
    }

    await failInvestmentPayment(orderId, order.cf_order_id ? String(order.cf_order_id) : undefined);
    return redirect('failed');
  } catch (error: any) {
    console.error('Error in Cashfree return for investment:', error);
    return redirect('error');
  }
}
