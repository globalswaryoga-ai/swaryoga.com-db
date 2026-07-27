import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
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

/**
 * GET /api/admin/crm/kp-astro/rule-book
 * Lists the astrologer's structured Rule Book (promise/denial house
 * combinations by life-matter), grouped by category on the client.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = authorize(request);
    if (auth.error) return auth.error;

    await connectDB();
    const KpRuleBookEntry = getKpRuleBookEntry();
    const entries = await (KpRuleBookEntry as any).find({}).sort({ category: 1, order: 1 }).lean();
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load rule book';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/kp-astro/rule-book
 * Adds one Rule Book entry (a single row under a category).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({} as any));
    const category = String(body?.category || '').trim();
    const subMatter = String(body?.subMatter || '').trim();
    if (!category || !subMatter) {
      return NextResponse.json({ error: 'Category and sub-matter are required' }, { status: 400 });
    }

    await connectDB();
    const KpRuleBookEntry = getKpRuleBookEntry();
    const primaryHouse = Number(body?.primaryHouse);
    const created = await (KpRuleBookEntry as any).create({
      category,
      subMatter,
      primaryHouse: Number.isInteger(primaryHouse) && primaryHouse >= 1 && primaryHouse <= 12 ? primaryHouse : undefined,
      promiseHouses: String(body?.promiseHouses || '').trim(),
      denialHouses: String(body?.denialHouses || '').trim(),
      dashaBhuktiAntara: String(body?.dashaBhuktiAntara || '').trim(),
      gocharNote: String(body?.gocharNote || '').trim(),
      notes: String(body?.notes || '').trim(),
      order: Number.isFinite(body?.order) ? body.order : 0,
      isDraft: false,
      createdByUserId: getViewerUserId(auth.decoded),
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add rule book entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
