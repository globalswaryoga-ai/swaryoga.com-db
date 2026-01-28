import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { processDueBroadcastRuns } from '@/lib/broadcastRuns';
import { verifyToken } from '@/lib/auth';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(provided && provided === expected);
}

function verifyAdmin(request: NextRequest): boolean {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  return Boolean(decoded?.isAdmin);
}

/**
 * POST /api/admin/crm/broadcast-runs/run
 *
 * Call this from Vercel Cron / server cron / PM2 cron to process due broadcast runs.
 * Security: requires CRON_SECRET header OR admin JWT token.
 */
export async function POST(request: NextRequest) {
  try {
    // Allow either CRON_SECRET or admin JWT authentication
    if (!verifyCronSecret(request) && !verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const runLimit = typeof body?.runLimit === 'number' ? body.runLimit : undefined;
    const perRunMessageLimit = typeof body?.perRunMessageLimit === 'number' ? body.perRunMessageLimit : undefined;

    const data = await processDueBroadcastRuns({ runLimit, perRunMessageLimit });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-runs/run');
  }
}
