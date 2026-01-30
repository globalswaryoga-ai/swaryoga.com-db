import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { processDueBroadcastRuns, processSpecificBroadcastRun } from '@/lib/broadcastRuns';
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
 * 
 * Body options:
 * - runId: (optional) specific run ID to process
 * - runLimit: (optional) max runs to process (default 10)
 * - perRunMessageLimit: (optional) max messages per run (default 200)
 */
export async function POST(request: NextRequest) {
  try {
    const hasCronSecret = verifyCronSecret(request);
    const hasAdminAuth = verifyAdmin(request);
    
    console.log('[Broadcast Run] Auth check - cronSecret:', hasCronSecret, 'adminAuth:', hasAdminAuth);
    
    // Allow either CRON_SECRET or admin JWT authentication
    if (!hasCronSecret && !hasAdminAuth) {
      console.log('[Broadcast Run] Unauthorized - no valid auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const runId = typeof body?.runId === 'string' ? body.runId : undefined;
    const runLimit = typeof body?.runLimit === 'number' ? body.runLimit : undefined;
    const perRunMessageLimit = typeof body?.perRunMessageLimit === 'number' ? body.perRunMessageLimit : undefined;

    console.log('[Broadcast Run] Processing with params:', { runId, runLimit, perRunMessageLimit });
    
    let data;
    if (runId) {
      // Process a specific run by ID (for manual "Run Now" button)
      data = await processSpecificBroadcastRun(runId, { perRunMessageLimit });
    } else {
      // Process all due runs (for cron)
      data = await processDueBroadcastRuns({ runLimit, perRunMessageLimit });
    }
    
    console.log('[Broadcast Run] Result:', JSON.stringify(data));
    
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[Broadcast Run] Error:', error);
    return handleCrmError(error, 'POST broadcast-runs/run');
  }
}
