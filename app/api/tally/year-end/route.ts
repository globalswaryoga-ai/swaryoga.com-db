/**
 * Year-End Closing API
 * POST /api/tally/year-end  { action: carry-forward, fromFY, toFY }
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { closeFinancialYear } from '@/lib/tally/engine';
import { getTallyOwnerIdForWrite } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';

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
    const { action, fromFY, toFY } = body;

    if (action === 'carry-forward') {
      if (!fromFY || !toFY) return apiError('VALIDATION_ERROR', 'fromFY and toFY required');
      // Parse target FY dates: e.g. "2025-26" → Apr 2025 to Mar 2026
      const [startYr] = toFY.split('-').map(Number);
      const nextStart = new Date(`${startYr}-04-01`);
      const nextEnd = new Date(`${startYr + 1}-03-31`);
      const writeOwnerId = getTallyOwnerIdForWrite(decoded);
      const result = await closeFinancialYear(fromFY, toFY, nextStart, nextEnd, (decoded as any).userId, writeOwnerId);
      return apiSuccess(result);
    }

    return apiError('VALIDATION_ERROR', 'Invalid action');
  } catch (e: any) {
    return apiError('INTERNAL_ERROR', e.message);
  }
}
