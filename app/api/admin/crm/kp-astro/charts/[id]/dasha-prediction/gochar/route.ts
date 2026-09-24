import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart } from '@/lib/schemas/enterpriseSchemas';
import { computeFourStepSignificators } from '@/lib/kpAstro/significators';
import { findEventSignificators, findPlanetGocharMatches } from '@/lib/kpAstro/eventTiming';
import type { TransitPlanet } from '@/lib/kpAstro/ephemeris';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_GOCHAR_PLANETS: TransitPlanet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];

/**
 * POST /api/admin/crm/kp-astro/charts/[id]/dasha-prediction/gochar
 * Astrologer picks any of the 9 grahas to check as gochar (transit) for the
 * currently-selected Dasha/Bhukti chain -- scans that planet's own transit
 * across the given period for when its sign/star/sub-lord is a significator
 * of the chain's combined karyesh houses.
 * Body: { chainPlanets: string[], periodStart: string, periodEnd: string, gocharPlanet: string }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const chainPlanets: string[] = Array.isArray(body?.chainPlanets) ? body.chainPlanets.filter((p: any) => typeof p === 'string' && p) : [];
    const gocharPlanet: string = typeof body?.gocharPlanet === 'string' ? body.gocharPlanet : '';
    const periodStart = body?.periodStart ? new Date(body.periodStart) : null;
    const periodEnd = body?.periodEnd ? new Date(body.periodEnd) : null;

    if (chainPlanets.length === 0) return NextResponse.json({ error: 'chainPlanets is required' }, { status: 400 });
    if (!VALID_GOCHAR_PLANETS.includes(gocharPlanet as TransitPlanet)) {
      return NextResponse.json({ error: `gocharPlanet must be one of: ${VALID_GOCHAR_PLANETS.join(', ')}` }, { status: 400 });
    }
    if (!periodStart || !periodEnd) return NextResponse.json({ error: 'periodStart and periodEnd are required' }, { status: 400 });

    await connectDB();
    const KpHoroscopeChart = getKpHoroscopeChart();
    const chart = await (KpHoroscopeChart as any).findById(id).lean();
    if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 });

    const houses = chart.houses || [];
    const planets = chart.planets || [];

    const allSig = computeFourStepSignificators(houses, planets);
    const combinedHouses = Array.from(new Set(
      chainPlanets.flatMap((p) => {
        const sig = allSig.find((s) => s.planet === p);
        return sig ? [...sig.A, ...sig.B, ...sig.C, ...sig.D] : [];
      })
    )).sort((a, b) => a - b);

    // A single-house overlap is too weak a bar here: combinedHouses can be as
    // small as one planet's own 3-4 houses, and with only 9 possible sign/
    // star/sub lords, "touches ANY one of these houses" ends up flagging
    // nearly every planet (verified: Ketu's own [2,3,5,8] flagged all 9/9),
    // which made the daily gochar scan match almost every single day at full
    // strength -- no real signal. Require a majority of the target houses so
    // only planets genuinely tied to this chain's houses count.
    const allSignificators = findEventSignificators(houses, planets, combinedHouses);
    const majorityThreshold = Math.max(1, Math.ceil(combinedHouses.length / 2));
    const significators = allSignificators.filter((s) => s.matchedHouses.length >= majorityThreshold);
    const significatorPlanetNames = significators.map((s) => s.planet);

    const matches = await findPlanetGocharMatches(periodStart, periodEnd, gocharPlanet as TransitPlanet, significatorPlanetNames);

    return NextResponse.json({
      success: true,
      data: { combinedHouses, significators, gocharPlanet, matches },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute gochar matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
