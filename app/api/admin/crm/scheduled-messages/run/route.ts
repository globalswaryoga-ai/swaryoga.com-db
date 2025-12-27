import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { runDueWhatsAppScheduledJobs } from '@/lib/whatsappScheduler';

function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
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
