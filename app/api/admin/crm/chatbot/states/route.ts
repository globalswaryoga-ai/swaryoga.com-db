import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getChatbotConversationState } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/chatbot/states?leadIds=id1,id2,...
 * Returns chatbot conversation state for each lead (mode, activeFlowId, lastBotReplyAt).
 * Used by the manage page to show green/red/blue chatbot status indicators.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadIdsParam = request.nextUrl.searchParams.get('leadIds') || '';
    const leadIds = leadIdsParam.split(',').filter(Boolean);

    if (!leadIds.length) {
      return NextResponse.json({ success: true, states: {} });
    }

    await connectDB();
    const ChatbotState = getChatbotConversationState();

    const states = await ChatbotState.find(
      { leadId: { $in: leadIds } },
      { leadId: 1, mode: 1, activeFlowId: 1, lastBotReplyAt: 1, flowStartedAt: 1, updatedAt: 1 }
    ).lean();

    // Build a map: leadId -> status info
    const stateMap: Record<string, { mode: string; hasActiveFlow: boolean; lastBotReplyAt: string | null }> = {};
    for (const s of states) {
      const st = s as any;
      stateMap[String(st.leadId)] = {
        mode: st.mode || 'bot',
        hasActiveFlow: !!st.activeFlowId,
        lastBotReplyAt: st.lastBotReplyAt ? new Date(st.lastBotReplyAt).toISOString() : (st.updatedAt ? new Date(st.updatedAt).toISOString() : null),
      };
    }

    return NextResponse.json({ success: true, states: stateMap });
  } catch (err: any) {
    console.error('[chatbot/states] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
