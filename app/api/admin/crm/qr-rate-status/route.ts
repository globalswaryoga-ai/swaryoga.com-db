/**
 * GET /api/admin/crm/qr-rate-status
 * Returns the current QR broadcast rate-limit state for the viewer:
 *   - daySent / dayRemaining (cap 200, resets 5 AM IST)
 *   - hourSent / hourRemaining (cap 20, resets on the hour)
 *
 * Used by the broadcast UI to show "X/200 today, Y/20 this hour".
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getCurrentCounts, DAILY_LIMIT, HOURLY_LIMIT } from '@/lib/qrSendRateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = getViewerUserId(decoded);
  const counts = await getCurrentCounts(userId);

  return NextResponse.json({
    success: true,
    dailyLimit: DAILY_LIMIT,
    hourlyLimit: HOURLY_LIMIT,
    ...counts,
  });
}
