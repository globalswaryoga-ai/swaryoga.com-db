/**
 * Tally Reports API
 * GET /api/tally/reports?type=trial-balance|profit-loss|balance-sheet|monthly-pl|summary|cash-bank|ca-audit&fy=2025-26
 * POST /api/tally/reports  — year-end closing
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import {
  generateTrialBalance,
  generateProfitLoss,
  generateBalanceSheet,
  getAccountingSummary,
  getCashBankSummary,
  generateMonthlyPL,
  closeFinancialYear,
  generateCAAuditReport,
} from '@/lib/tally/engine';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'summary';
    const fy = searchParams.get('fy') || '2023-24';
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    switch (reportType) {
      case 'trial-balance': {
        const tb = await generateTrialBalance(fy, dateTo);
        return apiSuccess({
          reportType: 'Trial Balance',
          financialYear: fy,
          ...tb,
        });
      }

      case 'profit-loss': {
        const pl = await generateProfitLoss(fy, dateTo);
        return apiSuccess({
          reportType: 'Profit & Loss',
          financialYear: fy,
          ...pl,
        });
      }

      case 'balance-sheet': {
        const bs = await generateBalanceSheet(fy, dateTo);
        return apiSuccess({
          reportType: 'Balance Sheet',
          financialYear: fy,
          ...bs,
        });
      }

      case 'monthly-pl': {
        const monthly = await generateMonthlyPL(fy);
        return apiSuccess({
          reportType: 'Monthly Profit & Loss',
          financialYear: fy,
          months: monthly,
        });
      }

      case 'cash-bank': {
        const cb = await getCashBankSummary(fy);
        return apiSuccess({
          reportType: 'Cash & Bank Summary',
          financialYear: fy,
          accounts: cb,
        });
      }

      case 'summary': {
        const summary = await getAccountingSummary(fy);
        return apiSuccess({
          reportType: 'Dashboard Summary',
          ...summary,
        });
      }

      case 'ca-audit': {
        const audit = await generateCAAuditReport(fy);
        return apiSuccess({
          reportType: 'CA Audit Report',
          ...audit,
        });
      }

      default:
        return apiError('VALIDATION_ERROR', `Unknown report type: ${reportType}. Use: trial-balance, profit-loss, balance-sheet, monthly-pl, cash-bank, summary, ca-audit`);
    }
  } catch (error: any) {
    console.error('[Tally Reports GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/tally/reports — Year-End Closing
 * Body: { action: "close-year", currentFY: "2023-24", nextFY: "2024-25", nextStartDate, nextEndDate }
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { action, currentFY, nextFY, nextStartDate, nextEndDate } = body;

    if (action !== 'close-year') {
      return apiError('VALIDATION_ERROR', 'action must be "close-year"');
    }

    if (!currentFY || !nextFY || !nextStartDate || !nextEndDate) {
      return apiError('VALIDATION_ERROR', 'currentFY, nextFY, nextStartDate, nextEndDate are required');
    }

    const result = await closeFinancialYear(
      currentFY,
      nextFY,
      new Date(nextStartDate),
      new Date(nextEndDate),
      (decoded as any)?.userId,
    );

    return apiSuccess(result);
  } catch (error: any) {
    console.error('[Tally Reports POST]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
