import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
} from '@/lib/crm-handlers';
import { BroadcastList } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    await connectDB();

    const q = url.searchParams.get('q')?.trim();

    const filter: any = { createdByUserId: String(userId) };
    if (q) filter.name = { $regex: q, $options: 'i' };

    const lists = await BroadcastList.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await BroadcastList.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ lists, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-lists');
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

    // Upsert-like behavior: if list name already exists for this user, return it.
    const existing = await BroadcastList.findOne({ createdByUserId: String(userId), name }).lean();
    if (existing) return formatCrmSuccess(existing);

    const created = await BroadcastList.create({
      name,
      createdByUserId: String(userId),
      description: typeof body?.description === 'string' ? body.description : undefined,
      enabled: typeof body?.enabled === 'boolean' ? body.enabled : true,
    });

    return formatCrmSuccess(created);
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-lists');
  }
}
