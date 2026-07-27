import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpRuleBookEntry } from '@/lib/schemas/enterpriseSchemas';

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

const EDITABLE_FIELDS = ['category', 'subMatter', 'promiseHouses', 'denialHouses', 'dashaBhuktiAntara', 'gocharNote', 'notes'] as const;

/**
 * PATCH /api/admin/crm/kp-astro/rule-book/[id]
 * Edits an existing Rule Book entry. Any edit clears isDraft, since the
 * astrologer has now reviewed/corrected it against their own toolkit.
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
    const update: Record<string, string | number | boolean | null> = { isDraft: false };
    for (const field of EDITABLE_FIELDS) {
      if (typeof body?.[field] === 'string') update[field] = body[field].trim();
    }
    if (Number.isFinite(body?.order)) update.order = body.order;
    if (body?.primaryHouse === null) update.primaryHouse = null;
    else if (Number.isInteger(body?.primaryHouse) && body.primaryHouse >= 1 && body.primaryHouse <= 12) update.primaryHouse = body.primaryHouse;
    if (!update.category && !update.subMatter && Object.keys(update).length <= 1) {
      // Nothing but isDraft would change -- still allow it (e.g. explicit
      // "mark as verified" action with no other field edits).
    }

    await connectDB();
    const KpRuleBookEntry = getKpRuleBookEntry();
    const updated = await (KpRuleBookEntry as any).findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: 'Rule book entry not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update rule book entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/crm/kp-astro/rule-book/[id]
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
    const KpRuleBookEntry = getKpRuleBookEntry();
    const deleted = await (KpRuleBookEntry as any).findByIdAndDelete(id).lean();
    if (!deleted) return NextResponse.json({ error: 'Rule book entry not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete rule book entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
