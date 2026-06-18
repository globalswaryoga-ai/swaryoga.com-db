import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { computeDashaSubLevels, DASHA_LEVELS, type DashaLevel } from '@/lib/kpAstro/vimshottariDasha';

export const dynamic = 'force-dynamic';

// On-demand Sookshma/Prana drill-down for one chosen window — see the
// "eager vs on-demand" split explained in vimshottariDasha.ts.
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as any));
    const { level, parentPath, planet, startDate, endDate, deepestLevel } = body || {};

    if (!DASHA_LEVELS.includes(level)) return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    if (!planet || !startDate || !endDate) return NextResponse.json({ error: 'planet, startDate, endDate are required' }, { status: 400 });
    const targetLevel: DashaLevel = DASHA_LEVELS.includes(deepestLevel) ? deepestLevel : 'prana';

    const rows = computeDashaSubLevels(level, parentPath || '', planet, new Date(startDate), new Date(endDate), targetLevel);

    return NextResponse.json({ success: true, data: rows }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute sub-levels';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
