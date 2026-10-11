import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { bunnyChatbotMetaRuntime } from '@/lib/bunnyChatbotMetaRuntime';
import { chatbotOwnsLead, ChatbotRuntimeError } from '@/lib/bunnyChatbotRuntimeEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const decoded = verifyToken(authorization.startsWith('Bearer ') ? authorization.slice(7) : '');
    if (!decoded?.isAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (typeof body?.flowId !== 'string' || typeof body?.leadId !== 'string' || !body.flowId || !body.leadId) {
      return NextResponse.json({ success: false, error: 'Missing flowId or leadId' }, { status: 400 });
    }
    const viewer = getViewerUserId(decoded);
    const result = await bunnyExecute({ sql: 'SELECT created_by_user_id FROM chatbot_flows_sql WHERE document_id=?', args: [body.flowId] });
    const owner = String(result.rows[0]?.created_by_user_id || '');
    if (!owner) return NextResponse.json({ success: false, error: 'Flow not found' }, { status: 404 });
    if (!isSuperAdmin(decoded) && viewer !== owner) {
      return NextResponse.json({ success: false, error: 'Flow belongs to another CRM Admin' }, { status: 403 });
    }
    const lead = await getBunnyLeadById(body.leadId);
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    if (!chatbotOwnsLead(lead, owner) || (!isSuperAdmin(decoded) && !chatbotOwnsLead(lead, viewer))) {
      return NextResponse.json({ success: false, error: 'Lead does not belong to the flow owner' }, { status: 403 });
    }
    const response = await bunnyChatbotMetaRuntime.start({
      leadId: String(lead._id), flowId: body.flowId, phoneNumber: String(lead.phoneNumber || ''), ownerUserId: owner,
    });
    return NextResponse.json(response);
  } catch (error) {
    const known = error instanceof ChatbotRuntimeError;
    return NextResponse.json({
      success: false, error: error instanceof Error ? error.message : 'Chatbot start failed',
      code: known ? error.code : 'runtime_failed',
      ...(known && error.acceptedMessageId ? { acceptedMessageId: error.acceptedMessageId, automaticResend: false } : {}),
    }, { status: known ? error.status : 500 });
  }
}
