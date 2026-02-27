/**
 * Tally Reports API
 * GET /api/tally/reports?type=trial-balance|profit-loss|balance-sheet|monthly-pl|summary|cash-bank|ca-audit&fy=2025-26
 * POST /api/tally/reports  — year-end closing
 *
 * Performance: P&L, BS, and CA-audit share a single batchCalculateLedgerBalances()
 * call via the "combo" report type. The frontend uses "combo" to load P&L + BS + CA
 * in a single request. Server-side cache (30s TTL) prevents re-computation on tab switch.
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
  carryForwardBalances,
  generateCAAuditReport,
  batchCalculateLedgerBalances,
  invalidateReportCache,
  getGroupSummary,
} from '@/lib/tally/engine';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

// ─── Server-side report cache (30s TTL) ──────────────────────────────
interface CacheEntry { data: any; expiresAt: number; }
const _routeCache = new Map<string, CacheEntry>();
const ROUTE_CACHE_TTL = 30_000;

function getCached(key: string): any | null {
  const entry = _routeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _routeCache.delete(key); return null; }
  return entry.data;
}

function setRouteCache(key: string, data: any): void {
  _routeCache.set(key, { data, expiresAt: Date.now() + ROUTE_CACHE_TTL });
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'summary';
    const fy = searchParams.get('fy') || '2023-24';
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    // Check cache first (skip for date-filtered queries)
    const cacheKey = `${reportType}:${fy}:${dateTo?.toISOString() || ''}`;
    const cached = getCached(cacheKey);
    if (cached) return apiSuccess(cached);

    let result: any;

    switch (reportType) {
      case 'trial-balance': {
        const tb = await generateTrialBalance(fy, dateTo);
        result = { reportType: 'Trial Balance', financialYear: fy, ...tb };
        break;
      }

      case 'profit-loss': {
        const balanceMap = await batchCalculateLedgerBalances(fy, dateTo);
        const pl = await generateProfitLoss(fy, dateTo, balanceMap);
        result = { reportType: 'Profit & Loss', financialYear: fy, ...pl };
        break;
      }

      case 'balance-sheet': {
        const balanceMap = await batchCalculateLedgerBalances(fy, dateTo);
        const pl = await generateProfitLoss(fy, dateTo, balanceMap);
        const bs = await generateBalanceSheet(fy, dateTo, balanceMap, pl);
        result = { reportType: 'Balance Sheet', financialYear: fy, ...bs };
        break;
      }

      case 'monthly-pl': {
        const monthly = await generateMonthlyPL(fy);
        result = { reportType: 'Monthly Profit & Loss', financialYear: fy, months: monthly };
        break;
      }

      case 'cash-bank': {
        const cb = await getCashBankSummary(fy);
        result = { reportType: 'Cash & Bank Summary', financialYear: fy, accounts: cb };
        break;
      }

      case 'summary': {
        const summary = await getAccountingSummary(fy);
        result = { reportType: 'Dashboard Summary', ...summary };
        break;
      }

      case 'ca-audit': {
        const audit = await generateCAAuditReport(fy);
        result = { reportType: 'CA Audit Report', ...audit };
        break;
      }

      case 'group-summary': {
        const groups = await getGroupSummary(fy);
        result = { reportType: 'Group Summary', financialYear: fy, groups };
        break;
      }

      default:
        return apiError('VALIDATION_ERROR', `Unknown report type: ${reportType}. Use: trial-balance, profit-loss, balance-sheet, monthly-pl, cash-bank, summary, ca-audit, group-summary`);
    }

    setRouteCache(cacheKey, result);
    return apiSuccess(result);
  } catch (error: any) {
    console.error('[Tally Reports GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/tally/reports — Year-End Closing / Carry Forward
 * Body: { action: "close-year" | "carry-forward", currentFY: "2023-24", nextFY: "2024-25", nextStartDate, nextEndDate }
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { action, currentFY, nextFY, nextStartDate, nextEndDate } = body;

    if (!['close-year', 'carry-forward'].includes(action)) {
      return apiError('VALIDATION_ERROR', 'action must be "close-year" or "carry-forward"');
    }

    if (!currentFY || !nextFY || !nextStartDate || !nextEndDate) {
      return apiError('VALIDATION_ERROR', 'currentFY, nextFY, nextStartDate, nextEndDate are required');
    }

    if (action === 'carry-forward') {
      const result = await carryForwardBalances(
        currentFY,
        nextFY,
        new Date(nextStartDate),
        new Date(nextEndDate),
        (decoded as any)?.userId,
      );
      return apiSuccess(result);
    }

    // close-year: carry forward + lock
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
