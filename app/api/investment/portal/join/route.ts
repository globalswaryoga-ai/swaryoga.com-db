import { NextRequest, NextResponse } from 'next/server';
import { createInvestmentBooking, getInvestmentStats, setBookingAmountRequested, BASE_UNIT_AMOUNT, BASE_MIN_BOOKING, InvestmentValidationError } from '@/lib/bunnyInvestmentRepository';
import { issueInvestorToken } from '@/lib/investorSession';

export const dynamic = 'force-dynamic';

const MAX_INVESTMENT_AMOUNT = 110000;

/**
 * POST /api/investment/portal/join
 * Creates an investment with NO payment recorded yet (status awaiting_payment).
 * The seat is held; payment is recorded only from the verified PayU callback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.investorName || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
    const email = String(body.email || '').trim();
    const amount = Number(body.totalInvestmentAmount || BASE_UNIT_AMOUNT);

    if (name.length < 3) return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 });
    if (phone.length !== 10) return NextResponse.json({ error: 'Enter a valid 10-digit WhatsApp number' }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
    if (!Number.isFinite(amount) || amount < BASE_UNIT_AMOUNT) {
      return NextResponse.json({ error: `Minimum investment is ₹${BASE_UNIT_AMOUNT.toLocaleString('en-IN')}` }, { status: 400 });
    }
    if (amount > MAX_INVESTMENT_AMOUNT) {
      return NextResponse.json({ error: `Maximum investment is ₹${MAX_INVESTMENT_AMOUNT.toLocaleString('en-IN')}` }, { status: 400 });
    }
    const payNow = body.payNowAmount === undefined || body.payNowAmount === '' ? BASE_MIN_BOOKING : Number(body.payNowAmount);
    if (!Number.isFinite(payNow) || payNow < BASE_MIN_BOOKING) {
      return NextResponse.json({ error: `Minimum payment now is ₹${BASE_MIN_BOOKING.toLocaleString('en-IN')} (non-refundable)` }, { status: 400 });
    }
    if (payNow > amount) {
      return NextResponse.json({ error: 'Payment now cannot be more than the investment amount' }, { status: 400 });
    }

    const stats = await getInvestmentStats();
    if (stats.remainingSlots <= 0) {
      return NextResponse.json({ error: 'All 150 seats are taken' }, { status: 409 });
    }

    const booking = await createInvestmentBooking({
      investorName: name,
      phone,
      email: email || undefined,
      city: String(body.city || '').trim() || undefined,
      state: String(body.state || '').trim() || undefined,
      postalAddress: String(body.postalAddress || '').trim() || undefined,
      totalInvestmentAmount: amount,
      amountPaidNow: 0,
      bookingPaymentMethod: 'pending',
      nomineeName: String(body.nomineeName || '').trim() || undefined,
      nomineeRelationship: String(body.nomineeRelationship || '').trim() || undefined,
      nomineePhone: String(body.nomineePhone || '').replace(/\D/g, '').slice(-10) || undefined,
    });

    if (!booking) return NextResponse.json({ error: 'Could not create your investment' }, { status: 500 });
    await setBookingAmountRequested(booking.id, payNow);

    return NextResponse.json({
      success: true,
      token: issueInvestorToken(booking.id),
      data: { investmentId: booking.id, certificateNumber: booking.certificateNumber, totalInvestmentAmount: booking.totalInvestmentAmount },
    });
  } catch (error: any) {
    if (error instanceof InvestmentValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Error in POST /api/investment/portal/join:', error);
    return NextResponse.json({ error: 'Could not complete registration. Please try again.' }, { status: 500 });
  }
}
