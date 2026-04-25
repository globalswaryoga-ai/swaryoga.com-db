import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { runDueChatbotActions } from '@/lib/chatbotScheduler';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers

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
 * POST /api/admin/crm/chatbot-actions/run
 *
 * Process due chatbot scheduled actions (delayed messages, wait-for-reply timeouts).
 * Should be called by Vercel Cron every minute.
 * Security: requires CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' ? body.limit : 100;

    const data = await runDueChatbotActions({ limit });
    return NextResponse.json({ success: true, data }, { status: 200 });
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
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await runDueChatbotActions({ limit: 100 });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET chatbot-actions/run');
  }
}
