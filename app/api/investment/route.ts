import { NextRequest, NextResponse } from 'next/server';
import {
  getInvestmentStats,
  createInvestmentBooking,
  recordRemainingPayment,
  getInvestmentById,
  getInvestmentByCertificate,
  getInvestmentsByPhone,
  calculateInvestmentReturns,
  BASE_UNIT_AMOUNT,
} from '@/lib/bunnyInvestmentRepository';

import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAdminRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyToken(token);
  return Boolean(decoded?.isAdmin || decoded?.userId);
}

/**
 * GET /api/investment
 * Public Stats or Investor Lookup
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const id = searchParams.get('id');
    const cert = searchParams.get('cert');
    const amount = searchParams.get('calcAmount');

    // 1. Calculator Preview
    if (amount) {
      const calcResult = calculateInvestmentReturns(Number(amount) || BASE_UNIT_AMOUNT);
      return NextResponse.json({ success: true, data: calcResult });
    }

    // 2. Specific Investor Lookup
    if (id) {
      const record = await getInvestmentById(id);
      if (!record) return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: record });
    }

    if (cert) {
      const record = await getInvestmentByCertificate(cert);
      if (!record) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: record });
    }

    if (phone) {
      const records = await getInvestmentsByPhone(phone);
      return NextResponse.json({ success: true, data: records });
    }

    // 3. Default: Live Stats & Capacity
    const stats = await getInvestmentStats();
    return NextResponse.json({
      success: true,
      data: {
        stats,
        baseUnitAmount: BASE_UNIT_AMOUNT,
        sampleReturns: calculateInvestmentReturns(BASE_UNIT_AMOUNT),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/investment:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/investment
 * Book a Slot (₹1,000 Booking Deposit or Custom/Full Amount)
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const {
      investorName,
      phone,
      email,
      city,
      state,
      postalAddress,
      totalInvestmentAmount = 11000,
      amountPaidNow = 1000,
      bookingTxnId,
      bookingPaymentMethod = 'online',
      nomineeName,
      nomineeRelationship,
      nomineeAge,
      nomineePhone,
    } = body;

    if (!investorName || !investorName.trim()) {
      return NextResponse.json({ error: 'Investor Full Name is required' }, { status: 400 });
    }

    if (!phone || !phone.trim() || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Valid 10-digit WhatsApp phone number is required' }, { status: 400 });
    }

    const safeTotal = Math.max(Number(totalInvestmentAmount) || 11000, 11000);
    const safePaidNow = Math.min(Math.max(Number(amountPaidNow) || 1000, 1000), safeTotal);

    // Check remaining slot capacity
    const stats = await getInvestmentStats();
    if (stats.remainingSlots <= 0) {
      return NextResponse.json({
        error: 'Sorry, all 150 investment slots have been reserved! Please contact support for waitlist.',
      }, { status: 409 });
    }

    const booking = await createInvestmentBooking({
      investorName: investorName.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      postalAddress: postalAddress?.trim(),
      totalInvestmentAmount: safeTotal,
      amountPaidNow: safePaidNow,
      bookingTxnId: bookingTxnId || `BK_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookingPaymentMethod,
      finalDeadline: '2027-01-05',
      nomineeName: nomineeName?.trim(),
      nomineeRelationship: nomineeRelationship?.trim(),
      nomineeAge: nomineeAge ? Number(nomineeAge) : undefined,
      nomineePhone: nomineePhone?.trim(),
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: `🎉 Investment Slot reserved successfully! Certificate: ${booking?.certificateNumber}`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/investment:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create booking' }, { status: 500 });
  }
}

/**
 * PUT /api/investment
 * Pay Remaining Balance (₹10,000 or custom)
 */
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const { investmentId, amountPaid, txnid, paymentMethod = 'online' } = body;

    if (!investmentId) {
      return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 });
    }

    if (!amountPaid || Number(amountPaid) <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    const updated = await recordRemainingPayment({
      investmentId,
      amountPaid: Number(amountPaid),
      txnid: txnid || `BAL_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      paymentMethod,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Payment of ₹${amountPaid} recorded! Remaining balance: ₹${updated?.remainingBalance}`,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/investment:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update payment' }, { status: 500 });
  }
}
