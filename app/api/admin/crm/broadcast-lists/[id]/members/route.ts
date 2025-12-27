import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { BroadcastList, BroadcastListMember } from '@/lib/schemas/enterpriseSchemas';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const listId = String(context?.params?.id || '').trim();
    if (!listId || !isValidObjectId(listId)) return NextResponse.json({ error: 'Invalid list id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const leadId = String(body?.leadId || '').trim();
    const phoneNumber = String(body?.phoneNumber || '').trim();

    if (!leadId || !isValidObjectId(leadId)) return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 });
    if (!phoneNumber) return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 });

    await connectDB();

    const list = await BroadcastList.findOne({ _id: toObjectId(listId), createdByUserId: String(userId) }).lean();
    if (!list) return NextResponse.json({ error: 'Broadcast list not found' }, { status: 404 });

    // Idempotent add: don't duplicate
    const existing = await BroadcastListMember.findOne({
      broadcastListId: toObjectId(listId),
      leadId: toObjectId(leadId),
    }).lean();

    if (existing) return formatCrmSuccess(existing);

    const created = await BroadcastListMember.create({
      broadcastListId: toObjectId(listId),
      leadId: toObjectId(leadId),
      phoneNumber,
      createdByUserId: String(userId),
    });

    return formatCrmSuccess(created);
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-lists/[id]/members');
  }
}
