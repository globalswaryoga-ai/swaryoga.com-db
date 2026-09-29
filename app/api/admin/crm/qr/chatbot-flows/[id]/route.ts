import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
} from '@/lib/crm-handlers';
import { getBunnyChatbotFlow, saveBunnyChatbotFlow, deleteBunnyChatbotFlow } from '@/lib/bunnyChatbotRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const ownerId = String(verifyAdminAccess(request));
    const id = String(context?.params?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    const flow = await getBunnyChatbotFlow(id, ownerId);
    if (!flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    return formatCrmSuccess(flow);
  } catch (error) {
    return handleCrmError(error, 'GET qr/chatbot-flows/[id]');
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const ownerId = String(verifyAdminAccess(request));
    const id = String(context?.params?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const existing = await getBunnyChatbotFlow(id, ownerId);
    if (!existing) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    const updated = await saveBunnyChatbotFlow({ ...existing, ...body, provider: 'qr' }, ownerId, id);
    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT qr/chatbot-flows/[id]');
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const ownerId = String(verifyAdminAccess(request));
    const id = String(context?.params?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid flow id' }, { status: 400 });

    const deletedCount = await deleteBunnyChatbotFlow(id, ownerId);
    if (!deletedCount) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    return formatCrmSuccess({ deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE qr/chatbot-flows/[id]');
  }
}
