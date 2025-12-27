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
import { LeadNote, Lead } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    await connectDB();

    const leadExists = await Lead.exists({ _id: toObjectId(String(id)) });
    if (!leadExists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const filter = { leadId: toObjectId(String(id)) };
    const notes = await LeadNote.find(filter).sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await LeadNote.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ notes, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET lead notes');
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const note = String(body?.note || '').trim();
    if (!note) return NextResponse.json({ error: 'note is required' }, { status: 400 });

    await connectDB();

    const leadExists = await Lead.exists({ _id: toObjectId(String(id)) });
    if (!leadExists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const created = await LeadNote.create({
      leadId: toObjectId(String(id)),
      createdByUserId: String(userId),
      note,
      pinned: Boolean(body?.pinned),
    });

    return formatCrmSuccess(created);
  } catch (error) {
    return handleCrmError(error, 'POST lead notes');
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const noteId = String(body?.noteId || '').trim();
    if (!noteId || !isValidObjectId(noteId)) return NextResponse.json({ error: 'Invalid noteId' }, { status: 400 });

    const allowed: any = {};
    if (Object.prototype.hasOwnProperty.call(body, 'note')) allowed.note = String(body.note || '').trim();
    if (Object.prototype.hasOwnProperty.call(body, 'pinned')) allowed.pinned = Boolean(body.pinned);

    await connectDB();

    const updated = await LeadNote.findOneAndUpdate(
      { _id: toObjectId(noteId), leadId: toObjectId(String(id)), createdByUserId: String(userId) },
      { $set: allowed },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT lead notes');
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;

    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

    const url = new URL(request.url);
    const noteId = url.searchParams.get('noteId');
    if (!noteId || !isValidObjectId(noteId)) return NextResponse.json({ error: 'Invalid noteId' }, { status: 400 });

    await connectDB();

    const res = await LeadNote.deleteOne({
      _id: toObjectId(String(noteId)),
      leadId: toObjectId(String(id)),
      createdByUserId: String(userId),
    });

    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess({ deletedCount: res.deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE lead notes');
  }
}
