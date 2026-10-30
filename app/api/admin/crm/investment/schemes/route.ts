import { NextRequest, NextResponse } from 'next/server';
import {
  listInvestmentSchemes,
  updateInvestmentScheme,
  createInvestmentScheme,
  addLegacyInvestmentRecord,
  markDividendAsPaid,
  InvestmentValidationError,
} from '@/lib/bunnyInvestmentRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EDITABLE_SCHEME_FIELDS = [
  'name',
  'description',
  'minInvestment',
  'annualDividendRatePct',
  'lateCompoundRatePct',
  'lateCompoundingFrequency',
  'graceDays',
  'profit5yrPerUnit',
  'profit10yrPerUnit',
] as const;

function errorResponse(error: any) {
  if (error instanceof InvestmentValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
}

/**
 * GET /api/admin/crm/investment/schemes
 * Returns all active schemes (rules) with their dividend and late compound interest settings
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value || request.cookies.get('crm_token')?.value);

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const schemes = await listInvestmentSchemes();
    return NextResponse.json({ success: true, data: schemes });
  } catch (error: any) {
    console.error('Error in GET /api/admin/crm/investment/schemes:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/crm/investment/schemes
 * Update a rule's dividend rate, late compound rate, compounding frequency, grace days.
 * Changes apply to all investors on that scheme (pending dividends are re-synced).
 */
export async function PATCH(request: NextRequest) {
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
    const { schemeId, updates } = body;

    if (!schemeId) {
      return NextResponse.json({ error: 'schemeId is required' }, { status: 400 });
    }

    const safeUpdates: Record<string, unknown> = {};
    for (const key of EDITABLE_SCHEME_FIELDS) {
      if (updates && updates[key] !== undefined && updates[key] !== '') {
        safeUpdates[key] = ['name', 'description', 'lateCompoundingFrequency'].includes(key)
          ? updates[key]
          : Number(updates[key]);
      }
    }

    const updated = await updateInvestmentScheme(schemeId, safeUpdates as any);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `✅ Rules for "${updated?.name}" saved. Calculations auto-reflect across all investors on this scheme.`,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/crm/investment/schemes:', error);
    return errorResponse(error);
  }
}

/**
 * POST /api/admin/crm/investment/schemes
 * action = 'create_scheme'         → create a new rule (periodic dividend plan)
 * action = 'mark_dividend_paid'    → record a 6-month dividend cycle as paid
 * action = 'add_legacy_investor'   → import an old investor onto a dividend scheme (default)
 */
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
    const { action = 'add_legacy_investor' } = body;

    if (action === 'create_scheme') {
      const scheme = await createInvestmentScheme({
        name: body.name,
        description: body.description,
        tenureYears: Number(body.tenureYears),
        payoutIntervalMonths: Number(body.payoutIntervalMonths),
        minInvestment: Number(body.minInvestment) || 0,
        annualDividendRatePct: Number(body.annualDividendRatePct),
        lateCompoundRatePct: Number(body.lateCompoundRatePct),
        lateCompoundingFrequency: body.lateCompoundingFrequency,
        graceDays: body.graceDays === undefined || body.graceDays === '' ? 0 : Number(body.graceDays),
      });
      return NextResponse.json({
        success: true,
        data: scheme,
        message: `✅ Rule "${scheme?.name}" created. You can now add investors to it.`,
      });
    }

    if (action === 'mark_dividend_paid') {
      const { dividendId, paidAmount, paidDate, paidTxnId, paidMethod, notes } = body;
      if (!dividendId) return NextResponse.json({ error: 'dividendId is required' }, { status: 400 });
      if (!(Number(paidAmount) > 0)) {
        return NextResponse.json({ error: 'paidAmount must be greater than 0' }, { status: 400 });
      }

      await markDividendAsPaid({
        dividendId,
        paidAmount: Number(paidAmount),
        paidDate,
        paidTxnId: paidTxnId || `DIV_PAID_${Date.now()}`,
        paidMethod,
        notes,
      });

      return NextResponse.json({
        success: true,
        message: '✅ Dividend marked as paid successfully!',
      });
    }

    // Default: add old / legacy investor onto a periodic dividend scheme
    const {
      schemeId,
      investorName,
      phone,
      email,
      city,
      totalInvestmentAmount,
      startDate,
      certificateNumber,
      amountPaid,
      panNumber,
      aadhaarNumber,
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      bankIfsc,
      nomineeName,
      nomineeRelationship,
      pastDividendsPaidCycles = [],
    } = body;

    if (!investorName || !phone || !startDate) {
      return NextResponse.json({
        error: 'Investor Name, Phone number, and Start Date are required to import legacy record',
      }, { status: 400 });
    }

    const legacyRecord = await addLegacyInvestmentRecord({
      schemeId,
      investorName,
      phone,
      email,
      city,
      totalInvestmentAmount: Number(totalInvestmentAmount),
      startDate,
      certificateNumber,
      amountPaid: amountPaid !== undefined && amountPaid !== '' ? Number(amountPaid) : undefined,
      panNumber,
      aadhaarNumber,
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      bankIfsc,
      nomineeName,
      nomineeRelationship,
      pastDividendsPaidCycles: (pastDividendsPaidCycles as unknown[]).map(Number),
    });

    return NextResponse.json({
      success: true,
      data: legacyRecord,
      message: `🎉 Legacy investor "${investorName}" added with dividend schedule. Certificate: ${legacyRecord?.certificateNumber}`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/crm/investment/schemes:', error);
    return errorResponse(error);
  }
}
