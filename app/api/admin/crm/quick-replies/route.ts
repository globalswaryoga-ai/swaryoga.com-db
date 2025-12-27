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
import { QuickReply } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    await connectDB();

    const q = url.searchParams.get('q')?.trim();
    const enabled = url.searchParams.get('enabled');

    const filter: any = { createdByUserId: String(userId) };
    if (enabled === 'true') filter.enabled = true;
    if (enabled === 'false') filter.enabled = false;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { shortcut: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
      ];
    }

    const replies = await QuickReply.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await QuickReply.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ replies, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET quick-replies');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    const shortcut = typeof body?.shortcut === 'string' ? body.shortcut.trim() : '';

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });

    await connectDB();

    const reply = await QuickReply.create({
      title,
      content,
      shortcut: shortcut || undefined,
      tags: Array.isArray(body?.tags) ? body.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
      enabled: typeof body?.enabled === 'boolean' ? body.enabled : true,
      createdByUserId: String(userId),
    });

    return formatCrmSuccess(reply);
  } catch (error) {
    return handleCrmError(error, 'POST quick-replies');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const id = String(body?.id || body?._id || '').trim();
    if (!id || !isValidObjectId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const allowed: any = {};
    for (const f of ['title', 'shortcut', 'content', 'tags', 'enabled']) {
      if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = body[f];
    }

    await connectDB();

    const updated = await QuickReply.findOneAndUpdate(
      { _id: toObjectId(id), createdByUserId: String(userId) },
      { $set: allowed },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT quick-replies');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id || !isValidObjectId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await connectDB();

    const res = await QuickReply.deleteOne({ _id: toObjectId(id), createdByUserId: String(userId) });
    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return formatCrmSuccess({ deletedCount: res.deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE quick-replies');
  }
}
