import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { runDueChatbotActions } from '@/lib/chatbotScheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Mark as dynamic since this route uses request.headers

function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(provided && provided === expected);
}

/**
 * POST /api/admin/crm/chatbot-actions/run
 *
 * Process due chatbot scheduled actions (delayed messages, wait-for-reply timeouts).
 * Should be called by Vercel Cron every minute.
 * Security: requires CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' ? Math.min(Math.max(Math.floor(body.limit), 1), 25) : 25;
    if (!Number.isFinite(limit)) return NextResponse.json({ error: 'Invalid action limit' }, { status: 400 });

    const data = await runDueChatbotActions({ limit });
    return NextResponse.json({ success: data.failedActions === 0, data }, { status: data.failedActions ? 207 : 200 });
  } catch (error) {
    return handleCrmError(error, 'POST chatbot-actions/run');
  }
}

/**
 * GET /api/admin/crm/chatbot-actions/run
 * 
 * Called by Vercel Cron every minute to process due chatbot scheduled actions.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await runDueChatbotActions({ limit: 25 });
    return NextResponse.json({ success: data.failedActions === 0, data }, { status: data.failedActions ? 207 : 200 });
  } catch (error) {
    return handleCrmError(error, 'GET chatbot-actions/run');
  }
}
