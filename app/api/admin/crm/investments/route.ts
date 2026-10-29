/**
 * API Route: Investments List & Create (Admin CRM)
 * Backed strictly by Bunny Database (Edge SQL).
 * GET  /api/admin/crm/investments - List all investments
 * POST /api/admin/crm/investments - Add new/legacy investment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  listAllInvestments,
  addLegacyInvestmentRecord,
  InvestmentRecord,
} from '@/lib/bunnyInvestmentRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function mapForCrm(inv: InvestmentRecord) {
  return {
    ...inv,
    _id: inv.id,
    id: inv.id,
    name: inv.investorName,
    phone: inv.phone,
    email: inv.email,
    amount: inv.totalInvestmentAmount,
    numberOfShares: inv.slotsCount,
    interestRate: inv.annualDividendRatePct,
    startDate: inv.startDate,
    endDate: inv.endDate,
    status: inv.status,
    certificateNumber: inv.certificateNumber,
    maturityAmount: inv.maturityAmount,
    paidDividend: inv.totalDividendsPaid,
    pendingDividend: inv.totalDividendsPending,
    overdueAmount: inv.totalOverdueInterest,
    isOldInvestment: inv.isLegacyData,
    entity: 'swar-sakshi' as const,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value || request.cookies.get('crm_token')?.value);

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const kycStatus = searchParams.get('kycStatus') || undefined;
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const listData = await listAllInvestments({ search, paymentStatus, kycStatus, limit, skip });
    const investments = listData.investments.map(mapForCrm);

    return NextResponse.json(
      {
        success: true,
        count: investments.length,
        total: listData.total,
        investments,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching investments from Bunny:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value || request.cookies.get('crm_token')?.value);

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      investorName,
      phone,
      email,
      city,
      amount,
      totalInvestmentAmount,
      amountPaid,
      startDate,
      certificateNumber,
      schemeId,
      pastDividendsPaidCycles = [],
      panNumber,
      aadhaarNumber,
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      bankIfsc,
      nomineeName,
      nomineeRelationship,
    } = body;

    const finalName = (investorName || name || '').trim();
    const finalPhone = (phone || '').trim();
    const finalAmount = Number(totalInvestmentAmount || amount);
    const finalStartDate = startDate || new Date().toISOString().split('T')[0];

    if (!finalName || !finalPhone || !(finalAmount > 0)) {
      return NextResponse.json(
        { error: 'Investor Name, Phone number, and Amount are required' },
        { status: 400 }
      );
    }

    const record = await addLegacyInvestmentRecord({
      schemeId,
      investorName: finalName,
      phone: finalPhone,
      email: email?.trim() || undefined,
      city: city?.trim() || undefined,
      totalInvestmentAmount: finalAmount,
      amountPaid: amountPaid !== undefined ? Number(amountPaid) : finalAmount,
      startDate: finalStartDate,
      certificateNumber: certificateNumber?.trim() || undefined,
      pastDividendsPaidCycles: Array.isArray(pastDividendsPaidCycles) ? pastDividendsPaidCycles : [],
      panNumber,
      aadhaarNumber,
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      bankIfsc,
      nomineeName,
      nomineeRelationship,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Investment added successfully to Bunny Database',
        certificateNumber: record.certificateNumber,
        investment: mapForCrm(record),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating investment in Bunny:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create investment' },
      { status: 500 }
    );
  }
}
