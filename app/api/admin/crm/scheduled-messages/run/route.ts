import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { runDueWhatsAppScheduledJobs } from '@/lib/whatsappScheduler';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  // If no CRON_SECRET is set, allow the request (for Vercel cron)
  if (!expected) return true;
  const provided = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  // Check for Vercel cron user-agent
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('vercel-cron')) return true;
  return Boolean(provided && provided === expected);
}

/**
 * POST /api/admin/crm/scheduled-messages/run
 *
 * Call this from Vercel Cron / server cron / PM2 cron to send due scheduled messages.
 * Security: requires CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const jobLimit = typeof body?.jobLimit === 'number' ? body.jobLimit : undefined;
    const leadsPerJobLimit = typeof body?.leadsPerJobLimit === 'number' ? body.leadsPerJobLimit : undefined;

    const data = await runDueWhatsAppScheduledJobs({ jobLimit, leadsPerJobLimit });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'POST scheduled-messages/run');
  }
}

/**
 * GET /api/admin/crm/scheduled-messages/run
 *
 * Vercel Cron sends GET requests. This handler processes all due scheduled messages.
 * Security: requires CRON_SECRET or Vercel Cron header.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Scheduled Messages GET] Processing due jobs...');
    const data = await runDueWhatsAppScheduledJobs();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET scheduled-messages/run');
  }
}
