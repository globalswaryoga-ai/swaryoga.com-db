import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { getBunnyChatbotFlow, saveBunnyChatbotFlow } from '@/lib/bunnyChatbotRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const ownerId = String(verifyAdminAccess(request));
    const original = await getBunnyChatbotFlow(String(context.params.id), ownerId);
    if (!original) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const idMap: Record<string, string> = {};
    const nodes = Array.isArray(original.nodes) ? original.nodes : [];
    for (const node of nodes) idMap[String(node.nodeId || node.id)] = `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const remap = (value: any) => value ? (idMap[String(value)] || value) : value;
    const clonedNodes = JSON.parse(JSON.stringify(nodes)).map((node: any) => {
      node.nodeId = remap(node.nodeId || node.id);
      delete node.id; delete node._id;
      const data = node.data || node;
      for (const key of ['options', 'templateButtons', 'branchConditions', 'randomPaths']) {
        if (Array.isArray(data[key])) data[key] = data[key].map((item: any) => ({ ...item, nextNodeId: remap(item.nextNodeId) }));
      }
      for (const key of ['nextNodeId', 'timeoutNodeId', 'fallbackNodeId']) if (data[key]) data[key] = remap(data[key]);
      return node;
    });
    const metadata = original.metadata ? JSON.parse(JSON.stringify(original.metadata)) : {};
    if (Array.isArray(metadata.canvas?.blocks)) metadata.canvas.blocks = metadata.canvas.blocks.map((b: any) => ({ ...b, id: remap(b.id) }));
    if (Array.isArray(metadata.canvas?.connections)) metadata.canvas.connections = metadata.canvas.connections.map((c: any) => ({ ...c, fromId: remap(c.fromId), toId: remap(c.toId) }));
    const created = await saveBunnyChatbotFlow({
      ...original,
      _id: undefined,
      name: String(body.name || `${original.name} (Copy)`),
      enabled: false,
      nodes: clonedNodes,
      startNodeId: remap(original.startNodeId),
      metadata,
    }, ownerId);
    return formatCrmSuccess(created);
  } catch (error) { return handleCrmError(error, 'POST duplicate chatbot flow'); }
}
