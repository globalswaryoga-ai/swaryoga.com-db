import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/chatbot/states?leadIds=id1,id2,...
 * Returns chatbot conversation state for each lead (mode, activeFlowId, lastBotReplyAt).
 * Used by the manage page to show green/red/blue chatbot status indicators.
 * 
 * Now reads from bunny database — the canonical flow state is on lead.metadata.chatbotFlowState.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadIdsParam = request.nextUrl.searchParams.get('leadIds') || '';
    const leadIds = leadIdsParam.split(',').filter(Boolean);

    if (!leadIds.length) {
      return NextResponse.json({ success: true, states: {} });
    }

    // Build states from lead metadata (canonical source) in bunny
    const stateMap: Record<string, { mode: string; hasActiveFlow: boolean; lastBotReplyAt: string | null }> = {};

    // Batch fetch leads from bunny
    const placeholders = leadIds.map(() => '?').join(',');
    let rows: any[] = [];
    try {
      const result = await bunnyExecute({
        sql: `SELECT document_id, data_json FROM leads_sql WHERE document_id IN (${placeholders})`,
        args: leadIds,
      });
      rows = result.rows;
    } catch {
      // If leads_sql doesn't exist or query fails, return empty states
      return NextResponse.json({ success: true, states: {} });
    }

    for (const row of rows) {
      const leadId = String((row as any).document_id);
      let data: any = {};
      try { data = JSON.parse(String((row as any).data_json || '{}')); } catch { data = {}; }
      const flowState = data?.metadata?.chatbotFlowState;
      stateMap[leadId] = {
        mode: flowState ? 'bot' : 'human',
        hasActiveFlow: !!flowState?.flowId,
        lastBotReplyAt: flowState?.updatedAt ? new Date(flowState.updatedAt).toISOString() : null,
      };
    }

    return NextResponse.json({ success: true, states: stateMap });
  } catch (err: any) {
    console.error('[chatbot/states] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
