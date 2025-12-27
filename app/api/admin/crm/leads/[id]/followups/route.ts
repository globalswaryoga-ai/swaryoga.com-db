import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { LeadFollowUp, Lead } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    const status = url.searchParams.get('status');

    await connectDB();

    const leadExists = await Lead.exists({ _id: toObjectId(String(id)) });
    if (!leadExists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const filter: any = { leadId: toObjectId(String(id)) };
    if (status && status !== 'all') filter.status = status;

    const followups = await LeadFollowUp.find(filter)
      .sort({ status: 1, dueAt: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await LeadFollowUp.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ followups, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET lead followups');
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const dueAtRaw = body?.dueAt;
    const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
    if (!dueAt || Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: 'dueAt is required (valid date)' }, { status: 400 });
    }

    await connectDB();

    const leadExists = await Lead.exists({ _id: toObjectId(String(id)) });
    if (!leadExists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const created = await LeadFollowUp.create({
      leadId: toObjectId(String(id)),
      createdByUserId: String(userId),
      assignedToUserId: typeof body?.assignedToUserId === 'string' ? body.assignedToUserId.trim() : undefined,
      title: typeof body?.title === 'string' ? body.title.trim() : 'Follow up',
      description: typeof body?.description === 'string' ? body.description.trim() : undefined,
      dueAt,
      timezone: typeof body?.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : 'Asia/Kolkata',
      status: 'open',
    });

    return formatCrmSuccess(created);
  } catch (error) {
    return handleCrmError(error, 'POST lead followups');
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const followUpId = String(body?.followUpId || '').trim();
    if (!followUpId || !isValidObjectId(followUpId)) {
      return NextResponse.json({ error: 'Invalid followUpId' }, { status: 400 });
    }

    const allowed: any = {};
    for (const f of ['title', 'description', 'assignedToUserId', 'timezone', 'status']) {
      if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = body[f];
    }
    if (Object.prototype.hasOwnProperty.call(body, 'dueAt')) {
      const d = new Date(body.dueAt);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid dueAt' }, { status: 400 });
      allowed.dueAt = d;
    }

    if (allowed.status === 'done') allowed.completedAt = new Date();

    await connectDB();

    const updated = await LeadFollowUp.findOneAndUpdate(
      {
        _id: toObjectId(followUpId),
        leadId: toObjectId(String(id)),
        // Either creator or assignee can update
        $or: [{ createdByUserId: String(userId) }, { assignedToUserId: String(userId) }],
      },
      { $set: allowed },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT lead followups');
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    const url = new URL(request.url);
    const followUpId = url.searchParams.get('followUpId');
    if (!followUpId || !isValidObjectId(followUpId)) {
      return NextResponse.json({ error: 'Invalid followUpId' }, { status: 400 });
    }

    await connectDB();

    const res = await LeadFollowUp.deleteOne({
      _id: toObjectId(String(followUpId)),
      leadId: toObjectId(String(id)),
      createdByUserId: String(userId),
    });

    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess({ deletedCount: res.deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE lead followups');
  }
}
