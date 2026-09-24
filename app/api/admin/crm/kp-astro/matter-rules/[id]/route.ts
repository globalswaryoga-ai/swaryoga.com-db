import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpMatterRule } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function authorize(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isSuperAdmin(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 }) };
  }
  return { decoded };
}

/**
 * PATCH /api/admin/crm/kp-astro/matter-rules/[id]
 * Edits an existing Matter -> Rule entry.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = authorize(request);
    if (auth.error) return auth.error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid rule id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const update: Record<string, string> = {};
    if (typeof body?.keyword === 'string' && body.keyword.trim()) update.keyword = body.keyword.trim();
    if (typeof body?.ruleText === 'string' && body.ruleText.trim()) update.ruleText = body.ruleText.trim();
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await connectDB();
    const KpMatterRule = getKpMatterRule();
    const updated = await (KpMatterRule as any).findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update matter rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/crm/kp-astro/matter-rules/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = authorize(request);
    if (auth.error) return auth.error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid rule id' }, { status: 400 });
    }

    await connectDB();
    const KpMatterRule = getKpMatterRule();
    const deleted = await (KpMatterRule as any).findByIdAndDelete(id).lean();
    if (!deleted) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete matter rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
