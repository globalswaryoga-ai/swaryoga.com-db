import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { ChatbotFlow } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const id = String(context?.params?.id || '').trim();
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    await connectDB();

    const flow = await ChatbotFlow.findOne({ _id: toObjectId(id), createdByUserId: String(userId) }).lean();
    if (!flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    return formatCrmSuccess(flow);
  } catch (error) {
    return handleCrmError(error, 'GET chatbot-flows/[id]');
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const id = String(context?.params?.id || '').trim();
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    await connectDB();

    const allowed = {
      name: body?.name,
      description: body?.description,
      enabled: body?.enabled,
      nodes: body?.nodes,
      startNodeId: body?.startNodeId,
    };

    const updated = await ChatbotFlow.findOneAndUpdate(
      { _id: toObjectId(id), createdByUserId: String(userId) },
      { $set: Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined)) },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT chatbot-flows/[id]');
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const id = String(context?.params?.id || '').trim();
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    await connectDB();

    const res = await ChatbotFlow.deleteOne({ _id: toObjectId(id), createdByUserId: String(userId) });
    if (!res.deletedCount) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    return formatCrmSuccess({ deletedCount: res.deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE chatbot-flows/[id]');
  }
}
