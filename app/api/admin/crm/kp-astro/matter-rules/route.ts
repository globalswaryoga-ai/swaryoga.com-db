import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getKpMatterRule } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/kp-astro/matter-rules
 * List the astrologer's Matter -> Rule library, used to auto-fill the
 * Prediction Template's Rule field based on the Matter text entered.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    await connectDB();
    const KpMatterRule = getKpMatterRule();
    const rules = await (KpMatterRule as any).find({}).sort({ keyword: 1 }).lean();
    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load matter rules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/kp-astro/matter-rules
 * Adds one Matter keyword -> Rule text entry.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as any));
    const keyword = String(body?.keyword || '').trim();
    const ruleText = String(body?.ruleText || '').trim();
    if (!keyword || !ruleText) {
      return NextResponse.json({ error: 'Both keyword and rule text are required' }, { status: 400 });
    }

    await connectDB();
    const KpMatterRule = getKpMatterRule();
    const created = await (KpMatterRule as any).create({ keyword, ruleText, createdByUserId: getViewerUserId(decoded) });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add matter rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
