/**
 * Tally Ledger Statement API
 * GET /api/tally/ledgers/[id]/statement?fy=2023-24
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLedgerStatement } from '@/lib/tally/engine';
import { resolveTallyOwnerId } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';


function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const fy = searchParams.get('fy') || '2023-24';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const ownerId = resolveTallyOwnerId(decoded);
    const statement = await getLedgerStatement(
      id,
      fy,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      ownerId,
    );

    return apiSuccess({
      reportType: 'Ledger Statement',
      financialYear: fy,
      ...statement,
    });
  } catch (error: any) {
    console.error('[Tally Ledger Statement]', error);
    if (error.message?.includes('not found')) {
      return apiError('NOT_FOUND', error.message);
    }
    return apiError('SERVER_ERROR', error.message);
  }
}
