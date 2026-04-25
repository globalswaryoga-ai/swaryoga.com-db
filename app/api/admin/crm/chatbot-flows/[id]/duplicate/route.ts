import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { ChatbotFlow } from '@/lib/schemas/enterpriseSchemas';


/**
 * POST /api/admin/crm/chatbot-flows/[id]/duplicate
 * Duplicate an existing chatbot flow with all its nodes and connections.
 * The new flow gets "(Copy)" appended to the name and starts as disabled.
 */
export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const id = String(context?.params?.id || '').trim();
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    await connectDB();

    const original = await ChatbotFlow.findOne({ _id: toObjectId(id), createdByUserId: String(userId) }).lean();
    if (!original) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    // Optional: read custom name from body
    let customName: string | undefined;
    try {
      const body = await request.json();
      if (body?.name) customName = String(body.name).trim();
    } catch { /* no body is fine */ }

    const newName = customName || `${(original as any).name} (Copy)`;

    // Generate new IDs for all nodes to avoid conflicts, and remap connections
    const nodeIdMap: Record<string, string> = {};
    const originalNodes: any[] = Array.isArray((original as any).nodes) ? (original as any).nodes : [];
    
    originalNodes.forEach((node: any) => {
      const oldId = node.id || node._id;
      nodeIdMap[oldId] = `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    });

    const clonedNodes = originalNodes.map((node: any) => {
      const oldId = node.id || node._id;
      const newNode = { ...node, id: nodeIdMap[oldId] };
      // Clean Mongo _id if present
      delete newNode._id;

      // Remap nextNodeId references in options, branchConditions, randomPaths, etc.
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

    // Remap startNodeId
    const oldStart = String((original as any).startNodeId || '');
    const newStartNodeId = nodeIdMap[oldStart] || oldStart;

    // Remap metadata connections if present
    let newMetadata = (original as any).metadata ? JSON.parse(JSON.stringify((original as any).metadata)) : undefined;
    if (newMetadata?.connections && Array.isArray(newMetadata.connections)) {
      newMetadata.connections = newMetadata.connections.map((conn: any) => ({
        ...conn,
        fromId: nodeIdMap[conn.fromId] || conn.fromId,
        toId: nodeIdMap[conn.toId] || conn.toId,
      }));
    }

    const created = await ChatbotFlow.create({
      name: newName,
      description: (original as any).description || '',
      enabled: false, // Duplicates start disabled for safety
      createdByUserId: String(userId),
      nodes: clonedNodes,
      startNodeId: newStartNodeId,
      metadata: newMetadata,
    });

    return formatCrmSuccess(created);
  } catch (error) {
    return handleCrmError(error, 'POST chatbot-flows/[id]/duplicate');
  }
}
