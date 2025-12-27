import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  handleCrmError,
  isValidObjectId,
  toObjectId,
  formatCrmSuccess,
} from '@/lib/crm-handlers';
import { WhatsAppScheduledJob } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;
    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await connectDB();

    const job = await WhatsAppScheduledJob.findOne({
      _id: toObjectId(String(id)),
      createdByUserId: String(userId),
    }).lean();

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return formatCrmSuccess(job);
  } catch (error) {
    return handleCrmError(error, 'GET scheduled-messages/[id]');
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;
    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    await connectDB();

    const allowed: any = {};

    // Support simple actions
    const action = typeof body.action === 'string' ? body.action : undefined;
    if (action === 'pause') allowed.status = 'paused';
    if (action === 'resume') allowed.status = 'active';
    if (action === 'cancel') allowed.status = 'cancelled';

    // Editable fields
    const editable = [
      'name',
      'messageContent',
      'nextRunAt',
      'timezone',
      'targetType',
      'targetLeadIds',
      'targetFilter',
      'recurrence',
      'maxRuns',
      'status',
    ];

    for (const f of editable) {
      if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = body[f];
    }

    if (allowed.nextRunAt) allowed.nextRunAt = new Date(allowed.nextRunAt);

    const updated = await WhatsAppScheduledJob.findOneAndUpdate(
      { _id: toObjectId(String(id)), createdByUserId: String(userId) },
      { $set: allowed },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT scheduled-messages/[id]');
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;
    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await connectDB();

    const res = await WhatsAppScheduledJob.deleteOne({ _id: toObjectId(String(id)), createdByUserId: String(userId) });
    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return formatCrmSuccess({ deletedCount: res.deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE scheduled-messages/[id]');
  }
}
