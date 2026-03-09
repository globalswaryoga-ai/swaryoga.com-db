/**
 * Tally Day Book API
 * GET /api/tally/daybook?fy=2023-24&date=2024-01-15
 * GET /api/tally/daybook?fy=2023-24&dateFrom=2024-01-01&dateTo=2024-01-31
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getDayBook, getReceiptsRegister, getPaymentsRegister, getDayBookLedgerSummary, getCashBankLedgers } from '@/lib/tally/engine';
import { resolveTallyOwnerId } from '@/lib/tally/access';

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
    const fy = searchParams.get('fy') || '2023-24';
    const date = searchParams.get('date');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const register = searchParams.get('register'); // 'receipts' or 'payments' or 'cashbank'

    const ownerId = resolveTallyOwnerId(decoded);

    // Cash/Bank ledger list (for selector)
    if (register === 'cashbank') {
      const ledgers = await getCashBankLedgers(fy, ownerId);
      return apiSuccess({
        register: 'CashBank',
        financialYear: fy,
        ledgers,
      });
    }

    // Receipts/Payments register
    if (register === 'receipts') {
      const receipts = await getReceiptsRegister(
        fy,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
        ownerId,
      );
      return apiSuccess({
        register: 'Receipts',
        financialYear: fy,
        entries: receipts,
        count: receipts.length,
      });
    }

    if (register === 'payments') {
      const payments = await getPaymentsRegister(
        fy,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
        ownerId,
      );
      return apiSuccess({
        register: 'Payments',
        financialYear: fy,
        entries: payments,
        count: payments.length,
      });
    }

    // Day Book
    const entries = await getDayBook(
      fy,
      date ? new Date(date) : undefined,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      ownerId,
    );

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of entries) {
      for (const e of entry.entries) {
        totalDebit += e.debit;
        totalCredit += e.credit;
      }
    }

    // If no voucher entries, provide ledger OB summary (CA Report data)
    let ledgerSummary: any = null;
    if (entries.length === 0) {
      ledgerSummary = await getDayBookLedgerSummary(fy, ownerId);
    }

    return apiSuccess({
      reportType: 'Day Book',
      financialYear: fy,
      date: date || undefined,
      dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : undefined,
      entries,
      count: entries.length,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      ledgerSummary,
    });
  } catch (error: any) {
    console.error('[Tally DayBook GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
