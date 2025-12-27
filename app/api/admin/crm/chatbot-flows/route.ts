import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
} from '@/lib/crm-handlers';
import { ChatbotFlow } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();

    await connectDB();

    const filter: any = { createdByUserId: String(userId) };
    if (q) filter.name = { $regex: q, $options: 'i' };

    const flows = await ChatbotFlow.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ChatbotFlow.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ flows, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET chatbot-flows');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    await connectDB();

    const created = await ChatbotFlow.create({
      name,
      description: typeof body?.description === 'string' ? body.description : undefined,
      enabled: typeof body?.enabled === 'boolean' ? body.enabled : true,
      createdByUserId: String(userId),
      nodes: Array.isArray(body?.nodes) ? body.nodes : [],
      startNodeId: String(body?.startNodeId || ''),
    });

    return formatCrmSuccess(created);
  } catch (error) {
    return handleCrmError(error, 'POST chatbot-flows');
  }
}
