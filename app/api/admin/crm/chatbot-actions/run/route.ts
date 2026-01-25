import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { runDueChatbotActions } from '@/lib/chatbotScheduler';

// Mark as dynamic since this route uses request.headers
export const dynamic = 'force-dynamic';

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
 * Health check - returns status without processing
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chatbot action scheduler is ready',
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET chatbot-actions/run');
  }
}
