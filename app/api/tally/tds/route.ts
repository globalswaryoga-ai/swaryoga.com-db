/**
 * TDS Management API
 * GET  /api/tally/tds?fy=...&section=...&quarter=...
 * POST /api/tally/tds { action: create|update|summary, ... }
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getTdsEntries, createTdsEntry, updateTdsEntry, getTdsSummary } from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const fy = request.nextUrl.searchParams.get('fy');
    if (!fy) return apiError('VALIDATION_ERROR', 'fy parameter required');

    const section = request.nextUrl.searchParams.get('section') || undefined;
    const quarter = request.nextUrl.searchParams.get('quarter') || undefined;

    const ownerId = resolveTallyOwnerId(decoded);
    const entries = await getTdsEntries(fy, { section, quarter }, ownerId);
    return apiSuccess({ entries });
  } catch (e: any) {
    return apiError('SERVER_ERROR', e.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { deducteeId, deducteeName, deducteePan, section, tdsRate, grossAmount, tdsAmount, netAmount, date, voucherId, voucherNumber, financialYear, quarter } = body;
      if (!deducteeId || !deducteeName || !section || !financialYear) return apiError('VALIDATION_ERROR', 'Required fields missing');
      const writeOwnerId = getTallyOwnerIdForWrite(decoded);
      const doc = await createTdsEntry({ deducteeId, deducteeName, deducteePan, section, tdsRate, grossAmount, tdsAmount, netAmount, date, voucherId, voucherNumber, financialYear, quarter, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });
      return apiSuccess({ tdsEntry: doc });
    }

    if (action === 'update') {
      const { id, ...data } = body;
      if (!id) return apiError('VALIDATION_ERROR', 'id required');
      const doc = await updateTdsEntry(id, data);
      return apiSuccess({ tdsEntry: doc });
    }

    if (action === 'summary') {
      const { financialYear } = body;
      if (!financialYear) return apiError('VALIDATION_ERROR', 'financialYear required');
      const ownerId = resolveTallyOwnerId(decoded);
      const summary = await getTdsSummary(financialYear, ownerId);
      return apiSuccess(summary);
    }

    return apiError('VALIDATION_ERROR', 'Invalid action');
  } catch (e: any) {
    return apiError('SERVER_ERROR', e.message);
  }
}
