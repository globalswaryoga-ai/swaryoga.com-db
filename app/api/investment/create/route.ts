/**
 * API Route: Create Investment
 * POST /api/investment/create
 * Creates a new investment record
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getInvestment } from '@/lib/schemas/investmentSchemas';
import { INVESTMENT_STATUS, ENTITIES } from '@/lib/investment-constants';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    console.log('[Investment API] Received body:', JSON.stringify(body, null, 2));
    
    const {
      userId,
      entity,
      shareType,
      amount,
      numberOfShares,
      sharePrice,
      startDate,
      endDate,
      name,
      phone,
      interestRate,
      dividendRate,
      compound,
      notes,
      earlyRefundAllowed,
      refundRule,
      isOldInvestment,
    } = body;

    // Validation
    if (!entity || !amount || !startDate || !endDate) {
      const missing = [];
      if (!entity) missing.push('entity');
      if (!amount) missing.push('amount');
      if (!startDate) missing.push('startDate');
      if (!endDate) missing.push('endDate');
      
      console.error('[Investment API] Missing fields:', missing);
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const Investment = getInvestment();

    // Build investment data object dynamically to avoid undefined/null issues
    const investmentData: any = {
      entity,
      amount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: INVESTMENT_STATUS.SUBMITTED,
      certificateNumber,
      compound: compound || false,
      isOldInvestment: isOldInvestment || false,
      earlyRefundAllowed: earlyRefundAllowed !== undefined ? earlyRefundAllowed : true,
      refundRule: refundRule || 'refund_at_maturity',
    };

    // Add optional fields only if provided
    if (userId) investmentData.userId = userId;
    if (name) investmentData.name = name;
    if (phone) investmentData.phone = phone;
    if (shareType && entity === ENTITIES.UPAMANYU) investmentData.shareType = shareType;
    if (numberOfShares) investmentData.numberOfShares = numberOfShares;
    if (sharePrice) investmentData.sharePrice = sharePrice;
    if (interestRate) investmentData.interestRate = interestRate;
    if (dividendRate) investmentData.dividendRate = dividendRate;
    if (notes) investmentData.notes = notes;

    // Create investment
    console.log('[Investment API] Creating investment with data:', JSON.stringify(investmentData, null, 2));
    const investment = await Investment.create(investmentData);
    console.log('[Investment API] Investment created successfully:', investment._id);

    // Populate user data if userId exists
    if (userId) {
      await investment.populate('userId', 'name email phone address');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Investment created successfully',
        certificateNumber: investment.certificateNumber,
        investment: investment.toObject(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Investment creation error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      errors: error.errors,
    });

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate certificate number' },
        { status: 400 }
      );
    }

    if (error.name === 'ValidationError') {
      const validationErrors: any = {};
      const errorArray: string[] = [];
      Object.entries(error.errors || {}).forEach(([field, err]: any) => {
        validationErrors[field] = err.message;
        errorArray.push(`${field}: ${err.message}`);
      });
      console.error('Validation errors:', validationErrors);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: errorArray,
          fieldErrors: validationErrors,
          message: 'Please check all required fields are provided correctly'
        },
        { status: 400 }
      );
    }

    // Log unexpected errors to help debug
    if (error.name === 'CastError') {
      return NextResponse.json(
        { 
          error: 'Invalid data format: ' + error.message,
          details: ['Invalid data type in request']
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: error.message || 'Failed to create investment',
        details: []
      },
      { status: 500 }
    );
  }
}
