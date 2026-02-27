/**
 * Bank Reconciliation API
 * POST /api/tally/reconcile — reconcile or unreconcile vouchers
 *
 * Body: { action: "reconcile" | "unreconcile", voucherIds: string[], reconciledDate?: string, bankDate?: string }
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { reconcileVouchers, unreconcileVouchers, setBudget } from '@/lib/tally/engine';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { action, voucherIds, reconciledDate, bankDate, ledgerId, budgetAmount } = body;

    if (action === 'reconcile') {
      if (!voucherIds?.length) return apiError('VALIDATION_ERROR', 'voucherIds required');
      if (!reconciledDate) return apiError('VALIDATION_ERROR', 'reconciledDate required');
      const result = await reconcileVouchers(
        voucherIds,
        new Date(reconciledDate),
        bankDate ? new Date(bankDate) : undefined,
      );
      return apiSuccess(result);
    }

    if (action === 'unreconcile') {
      if (!voucherIds?.length) return apiError('VALIDATION_ERROR', 'voucherIds required');
      const result = await unreconcileVouchers(voucherIds);
      return apiSuccess(result);
    }

    if (action === 'set-budget') {
      if (!ledgerId || budgetAmount === undefined) return apiError('VALIDATION_ERROR', 'ledgerId and budgetAmount required');
      const result = await setBudget(ledgerId, Number(budgetAmount));
      return apiSuccess(result);
    }

    return apiError('VALIDATION_ERROR', 'action must be "reconcile", "unreconcile", or "set-budget"');
  } catch (error: any) {
    console.error('[Tally Reconcile POST]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
