import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpToolkitReference } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/kp-astro/toolkit-reference
 * Read-only reference material imported verbatim from the astrologer's KP
 * toolkit spreadsheet (249 Sub-Lord master table, Houses Meaning, Aspect
 * rules, recommended software links). Returns everything grouped by sheetKey
 * in one response -- total payload is small (~287 rows).
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
    const KpToolkitReference = getKpToolkitReference();
    const rows = await (KpToolkitReference as any).find({}).sort({ sheetKey: 1, rowIndex: 1 }).lean();

    const grouped: Record<string, any[]> = {};
    for (const row of rows) {
      if (!grouped[row.sheetKey]) grouped[row.sheetKey] = [];
      grouped[row.sheetKey].push(row.data);
    }
    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load toolkit reference';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
