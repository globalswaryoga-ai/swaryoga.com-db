import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { processDueBroadcastRecurringSchedules } from '@/lib/broadcastRecurring';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function verifyVercelCron(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const vercelCronSecret = process.env.CRON_SECRET;

  if (vercelCronSecret && authHeader === `Bearer ${vercelCronSecret}`) {
    return true;
  }

  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('vercel-cron')) {
    return true;
  }

  return false;
}

function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
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
 * POST/GET /api/admin/crm/broadcast-recurring/run
 *
 * Cron entry point — creates the next due occurrence's BroadcastRun for each
 * active recurring schedule (applying the delivered/read cascading filter for
 * occurrence #2+). The created BroadcastRun is then sent by the existing
 * /api/admin/crm/broadcast-runs/run cron.
 */
export async function POST(request: NextRequest) {
  try {
    const hasCronSecret = verifyCronSecret(request);
    const hasVercelCron = verifyVercelCron(request);
    const hasAdminAuth = verifyAdmin(request);

    if (!hasCronSecret && !hasVercelCron && !hasAdminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await processDueBroadcastRecurringSchedules();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[Broadcast Recurring Run] Error:', error);
    return handleCrmError(error, 'POST broadcast-recurring/run');
  }
}

export async function GET(request: NextRequest) {
  try {
    const hasCronSecret = verifyCronSecret(request);
    const hasVercelCron = verifyVercelCron(request);
    const hasAdminAuth = verifyAdmin(request);

    if (!hasCronSecret && !hasVercelCron && !hasAdminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await processDueBroadcastRecurringSchedules();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[Broadcast Recurring Run GET] Error:', error);
    return handleCrmError(error, 'GET broadcast-recurring/run');
  }
}
