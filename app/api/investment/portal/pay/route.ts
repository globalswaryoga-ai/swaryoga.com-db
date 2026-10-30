import { NextRequest, NextResponse } from 'next/server';
import { getInvestmentById } from '@/lib/bunnyInvestmentRepository';
import { getInvestorIdFromRequest } from '@/lib/investorSession';
import { createInvestmentPayment, getPaymentOptions, newInvestmentTxnId, PaymentPurpose } from '@/lib/bunnyInvestmentPortal';
import { cashfreeCreateOrder, getCashfreeEnv, getCashfreeSdkUrl } from '@/lib/payments/cashfree';
import { getPublicBaseUrl } from '@/lib/investorConfig';

export const dynamic = 'force-dynamic';

/**
 * POST /api/investment/portal/pay  { purpose: 'booking' | 'balance' }
 * The amount is always calculated on the server. Creates a Cashfree order and
 * returns the payment session the browser uses to open checkout.
 */
export async function POST(request: NextRequest) {
  try {
    const investorId = getInvestorIdFromRequest(request);
    if (!investorId) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const purpose = body.purpose as PaymentPurpose;
    if (purpose !== 'booking' && purpose !== 'balance') {
      return NextResponse.json({ error: 'Choose booking or balance payment' }, { status: 400 });
    }

    const inv = await getInvestmentById(investorId);
    if (!inv) return NextResponse.json({ error: 'Investment not found' }, { status: 404 });

    const options = getPaymentOptions(inv);
    const option = purpose === 'booking' ? options.booking : options.balance;
    if (!option || option.amount <= 0) {
      return NextResponse.json({ error: 'Nothing is due for this payment right now' }, { status: 409 });
    }

    const returnBase = getPublicBaseUrl();
    if (getCashfreeEnv() === 'production' && !returnBase.startsWith('https://')) {
      return NextResponse.json({
        error: 'Payment return link must use https. Set NEXT_PUBLIC_APP_URL to the live site (for example https://swaryoga.com).',
      }, { status: 503 });
    }

    const txnid = newInvestmentTxnId();
    await createInvestmentPayment({ txnid, investmentId: inv.id, purpose, amount: option.amount });

    const order = await cashfreeCreateOrder({
      order_id: txnid,
      order_amount: Number(option.amount.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: inv.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50),
        customer_name: inv.investorName.slice(0, 100),
        customer_email: inv.email || `${inv.phone}@noreply.swaryoga.com`,
        customer_phone: inv.phone,
      },
      order_note: `Swar Yoga Investment ${inv.certificateNumber} (${purpose})`,
      order_meta: {
        return_url: `${getPublicBaseUrl()}/api/investment/portal/cashfree/return?order_id={order_id}`,
      },
    });

    if (!order.payment_session_id) {
      return NextResponse.json({ error: 'Payment could not be started. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: {
        txnid,
        amount: option.amount,
        paymentSessionId: order.payment_session_id,
        mode: getCashfreeEnv(),
        sdkUrl: getCashfreeSdkUrl(),
      },
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('is not configured')) {
      return NextResponse.json({ error: 'Online payment is not switched on yet. Please contact Swar Yoga.' }, { status: 503 });
    }
    console.error('Error in POST /api/investment/portal/pay:', error);
    return NextResponse.json({ error: message || 'Could not start payment. Please try again.' }, { status: 500 });
  }
}
