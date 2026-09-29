import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, parsePagination, handleCrmError, formatCrmSuccess, buildMetadata } from '@/lib/crm-handlers';
import { listBunnyChatbotFlows, saveBunnyChatbotFlow } from '@/lib/bunnyChatbotRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = String(verifyAdminAccess(request));
    const { limit, skip } = parsePagination(request);
    const q = new URL(request.url).searchParams.get('q')?.trim() || undefined;
    const result = await listBunnyChatbotFlows(userId, { limit, skip, q });
    return formatCrmSuccess(result, buildMetadata(result.total, limit, skip));
  } catch (error) { return handleCrmError(error, 'GET chatbot-flows'); }
}

export async function POST(request: NextRequest) {
  try {
    const userId = String(verifyAdminAccess(request));
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const created = await saveBunnyChatbotFlow({
      name,
      description: typeof body.description === 'string' ? body.description : '',
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      nodes: Array.isArray(body.nodes) ? body.nodes : [],
      startNodeId: String(body.startNodeId || ''),
      triggerKeywords: Array.isArray(body.triggerKeywords) ? body.triggerKeywords : [],
      metadata: body.metadata || {},
    }, userId);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) { return handleCrmError(error, 'POST chatbot-flows'); }
}
