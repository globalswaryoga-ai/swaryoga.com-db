import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { computeRulingPlanets } from '@/lib/kpAstro/rulingPlanets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Live "right now" Ruling Planets snapshot for the astrologer's reference
// area — defaults to Pune/IST if no location is given.
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const latitude = Number(searchParams.get('latitude') || 18.5204);
    const longitude = Number(searchParams.get('longitude') || 73.8567);
    const utcOffsetHours = Number(searchParams.get('utcOffsetHours') || 5.5);

    const snapshot = await computeRulingPlanets({ at: new Date(), latitude, longitude, utcOffsetHours });

    return NextResponse.json({ success: true, data: snapshot }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute ruling planets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
