import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { getBunnyChatbotFlow, saveBunnyChatbotFlow } from '@/lib/bunnyChatbotRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const ownerId = String(verifyAdminAccess(request));
    const id = String(context?.params?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    const original = await getBunnyChatbotFlow(id, ownerId);
    if (!original) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    let customName: string | undefined;
    try {
      const body = await request.json();
      if (body?.name) customName = String(body.name).trim();
    } catch { /* no body is fine */ }

    const newName = customName || `${original.name || 'Flow'} (Copy)`;

    const nodeIdMap: Record<string, string> = {};
    const originalNodes: any[] = Array.isArray(original.nodes) ? original.nodes : [];
    originalNodes.forEach((node: any) => {
      const oldId = node.id || node._id;
      nodeIdMap[oldId] = `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    });

    const clonedNodes = originalNodes.map((node: any) => {
      const oldId = node.id || node._id;
      const newNode = { ...node, id: nodeIdMap[oldId] };
      delete newNode._id;
      if (newNode.data) {
        if (Array.isArray(newNode.data.options)) {
          newNode.data.options = newNode.data.options.map((opt: any) => ({
            ...opt,
            nextNodeId: opt.nextNodeId ? (nodeIdMap[opt.nextNodeId] || opt.nextNodeId) : undefined,
          }));
        }
        if (Array.isArray(newNode.data.templateButtons)) {
          newNode.data.templateButtons = newNode.data.templateButtons.map((btn: any) => ({
            ...btn,
            nextNodeId: btn.nextNodeId ? (nodeIdMap[btn.nextNodeId] || btn.nextNodeId) : undefined,
          }));
        }
        if (Array.isArray(newNode.data.branchConditions)) {
          newNode.data.branchConditions = newNode.data.branchConditions.map((bc: any) => ({
            ...bc,
            nextNodeId: bc.nextNodeId ? (nodeIdMap[bc.nextNodeId] || bc.nextNodeId) : undefined,
          }));
        }
        if (Array.isArray(newNode.data.randomPaths)) {
          newNode.data.randomPaths = newNode.data.randomPaths.map((rp: any) => ({
            ...rp,
            nextNodeId: rp.nextNodeId ? (nodeIdMap[rp.nextNodeId] || rp.nextNodeId) : undefined,
          }));
        }
        if (newNode.data.timeoutNodeId) {
          newNode.data.timeoutNodeId = nodeIdMap[newNode.data.timeoutNodeId] || newNode.data.timeoutNodeId;
        }
      }
      return newNode;
    });

    const oldStart = String(original.startNodeId || '');
    const newStartNodeId = nodeIdMap[oldStart] || oldStart;

    let newMetadata = original.metadata ? JSON.parse(JSON.stringify(original.metadata)) : undefined;
    if (newMetadata?.connections && Array.isArray(newMetadata.connections)) {
      newMetadata.connections = newMetadata.connections.map((conn: any) => ({
        ...conn,
        fromId: nodeIdMap[conn.fromId] || conn.fromId,
        toId: nodeIdMap[conn.toId] || conn.toId,
      }));
    }

    const created = await saveBunnyChatbotFlow({
      name: newName,
      description: original.description || '',
      enabled: false,
      provider: 'qr',
      nodes: clonedNodes,
      startNodeId: newStartNodeId,
      triggerKeywords: original.triggerKeywords || [],
      metadata: newMetadata,
    }, ownerId);

    return formatCrmSuccess(created);
  } catch (error) {
    return handleCrmError(error, 'POST qr/chatbot-flows/[id]/duplicate');
  }
}
