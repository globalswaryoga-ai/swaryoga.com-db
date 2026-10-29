import { NextRequest, NextResponse } from 'next/server';
import {
  addLegacyInvestmentRecord,
  createInvestmentBooking,
  BASE_UNIT_AMOUNT,
} from '@/lib/bunnyInvestmentRepository';

export const dynamic = 'force-dynamic';

/**
 * POST /api/investment/create
 * Backed strictly by Bunny Database (Edge SQL).
 * Handles both admin legacy entries and form creations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      investorName,
      phone,
      email,
      city,
      state,
      address,
      amount,
      totalInvestmentAmount,
      amountPaid,
      startDate,
      certificateNumber,
      isOldInvestment,
      pastPaidCycles,
      nomineeName,
      nomineeRelationship,
      nomineePhone,
      bankName,
      bankAccount,
      bankAccountNumber,
      ifsc,
      bankIfsc,
      pan,
      panNumber,
      aadhar,
      aadhaarNumber,
    } = body;

    const finalName = (investorName || name || '').trim();
    const finalPhone = (phone || '').trim();
    const parsedAmount = Number(totalInvestmentAmount || amount) || BASE_UNIT_AMOUNT;

    if (!finalName || !finalPhone) {
      return NextResponse.json(
        { error: 'Investor Name and Phone number are required' },
        { status: 400 }
      );
    }

    // If marked as old/legacy investment or has a specific startDate / certificateNumber
    if (isOldInvestment || startDate || certificateNumber) {
      const legacyRecord = await addLegacyInvestmentRecord({
        investorName: finalName,
        phone: finalPhone,
        email: email?.trim() || undefined,
        city: city?.trim() || undefined,
        totalInvestmentAmount: parsedAmount,
        amountPaid: amountPaid !== undefined ? Number(amountPaid) : parsedAmount,
        startDate: startDate || new Date().toISOString().split('T')[0],
        certificateNumber: certificateNumber?.trim() || undefined,
        pastDividendsPaidCycles: Array.isArray(pastPaidCycles) ? pastPaidCycles : [],
        panNumber: panNumber || pan,
        aadhaarNumber: aadhaarNumber || aadhar,
        bankAccountHolder: finalName,
        bankName,
        bankAccountNumber: bankAccountNumber || bankAccount,
        bankIfsc: bankIfsc || ifsc,
        nomineeName,
        nomineeRelationship,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Investment record created in Bunny Database',
          certificateNumber: legacyRecord.certificateNumber,
          investmentId: legacyRecord.id,
          investment: legacyRecord,
        },
        { status: 201 }
      );
    }

    // Otherwise standard booking in Bunny
    const booking = await createInvestmentBooking({
      investorName: finalName,
      phone: finalPhone,
      email: email?.trim() || undefined,
      city: city?.trim() || undefined,
      state: state?.trim() || undefined,
      postalAddress: address?.trim() || undefined,
      totalInvestmentAmount: parsedAmount,
      nomineeName,
      nomineeRelationship,
      nomineePhone,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Investment booking created in Bunny Database',
        certificateNumber: booking.certificateNumber,
        investmentId: booking.id,
        investment: booking,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating investment in Bunny:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create investment' },
      { status: 500 }
    );
  }
}
