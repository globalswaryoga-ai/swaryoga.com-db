import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { getChatbotFlow, getChatbotConversationState } from '@/lib/schemas/enterpriseSchemas';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { startChatbotFlowForLead } from '@/lib/whatsappAutomation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/chatbot/flows?leadId=xxx
 * Returns all enabled chatbot flows + current active flow for the given lead.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded);

    await connectDB();
    const ChatbotFlow = getChatbotFlow();
    const ChatbotState = getChatbotConversationState();

    // Fetch all enabled flows (name, description, node count, status)
    const flows = await ChatbotFlow.find(
      { enabled: true, ...tf },
      { name: 1, description: 1, enabled: 1, nodes: 1, startNodeId: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).lean();

    const flowList = flows.map((f: any) => ({
      _id: String(f._id),
      name: f.name,
      description: f.description || '',
      nodeCount: Array.isArray(f.nodes) ? f.nodes.length : 0,
      enabled: f.enabled,
    }));

    // If leadId provided, fetch the current active flow from lead.metadata.chatbotFlowState (canonical source)
    let currentFlow: { flowId: string; flowName: string; startedAt: string | null } | null = null;
    const leadId = request.nextUrl.searchParams.get('leadId');
    if (leadId) {
      // Primary: check lead.metadata.chatbotFlowState (used by automation engine)
      const lead = await Lead.findOne({ _id: leadId, ...tf }).select({ 'metadata.chatbotFlowState': 1 }).lean() as any;
      const flowState = lead?.metadata?.chatbotFlowState;
      if (flowState?.flowId) {
        const activeFlow = flows.find((f: any) => String(f._id) === String(flowState.flowId)) as any;
        currentFlow = {
          flowId: String(flowState.flowId),
          flowName: activeFlow?.name || 'Unknown Flow',
          startedAt: flowState.updatedAt ? new Date(flowState.updatedAt).toISOString() : null,
        };
      } else {
        // Fallback: check ChatbotConversationState collection
        const state = await ChatbotState.findOne({ leadId, ...tf }, { activeFlowId: 1, flowStartedAt: 1 }).lean() as any;
        if (state?.activeFlowId) {
          const activeFlow = flows.find((f: any) => String(f._id) === String(state.activeFlowId)) as any;
          currentFlow = {
            flowId: String(state.activeFlowId),
            flowName: activeFlow?.name || 'Unknown Flow',
            startedAt: state.flowStartedAt ? new Date(state.flowStartedAt).toISOString() : null,
          };
        }
      }
    }

    return NextResponse.json({ success: true, flows: flowList, currentFlow });
  } catch (err: any) {
    console.error('[chatbot/flows GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/chatbot/flows
 * Start a chatbot flow for a lead — sets lead.metadata.chatbotFlowState
 * (the canonical state the engine reads) and sends the first message.
 * Body: { leadId, flowId, phoneNumber }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, flowId, phoneNumber } = await request.json();
    if (!leadId || !flowId) {
      return NextResponse.json({ error: 'leadId and flowId are required' }, { status: 400 });
    }
    const tf = tenantFilter(decoded);

    await connectDB();

    // Resolve phone number from lead if not provided
    let phone = phoneNumber;
    if (!phone) {
      const lead = await Lead.findOne({ _id: leadId, ...tf }).select({ phoneNumber: 1 }).lean() as any;
      phone = lead?.phoneNumber || '';
    }

    // Start the flow AND send the first message
    const result = await startChatbotFlowForLead({ leadId, flowId, phoneNumber: phone });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Fire-and-forget: Sync ChatbotConversationState for UI consistency (non-blocking)
    // This is non-critical — the canonical state is lead.metadata.chatbotFlowState
    const ChatbotState = getChatbotConversationState();
    const syncNow = new Date();
    ChatbotState.findOneAndUpdate(
      { leadId, ...tf },
      {
        $set: {
          activeFlowId: flowId,
          currentNodeId: null,
          flowStartedAt: syncNow,
          mode: 'bot',
          lastBotReplyAt: result.firstReply ? syncNow : undefined,
        },
        $setOnInsert: { phoneNumber: phone || '', messageCount: 0 },
      },
      { upsert: true, new: true }
    ).catch((stateErr: any) => {
      console.warn('[chatbot/flows POST] ChatbotConversationState sync error (non-critical):', stateErr);
    });

    // Resolve flow name for the UI
    const ChatbotFlow = getChatbotFlow();
    const startedFlow = await ChatbotFlow.findOne({ _id: flowId, ...tf }).select('name').lean() as any;

    return NextResponse.json({
      success: true,
      message: result.message,
      state: {
        flowId: String(flowId),
        flowName: startedFlow?.name || 'Flow',
        startedAt: syncNow.toISOString(),
      },
      firstReply: result.firstReply ? {
        text: result.firstReply.text,
        isTemplate: result.firstReply.isTemplate,
        hasButtons: (result.firstReply.interactiveButtons?.length || 0) > 0,
      } : null,
    });
  } catch (err: any) {
    console.error('[chatbot/flows POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/crm/chatbot/flows
 * Remove the current flow from a lead's conversation state.
 * Body: { leadId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }
    const tf = tenantFilter(decoded);

    await connectDB();
    const ChatbotState = getChatbotConversationState();

    await ChatbotState.findOneAndUpdate(
      { leadId, ...tf },
      {
        $set: {
          activeFlowId: null,
          currentNodeId: null,
          flowStartedAt: null,
          mode: 'human',
          collectedData: {},
          previousResponses: [],
        },
      }
    );

    // Also clear lead.metadata.chatbotFlowState (canonical state used by automation engine)
    await Lead.updateOne(
      { _id: leadId, ...tf },
      { $unset: { 'metadata.chatbotFlowState': 1, 'metadata.chatbotVariables': 1 } }
    );

    return NextResponse.json({ success: true, message: 'Flow removed from lead' });
  } catch (err: any) {
    console.error('[chatbot/flows DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
