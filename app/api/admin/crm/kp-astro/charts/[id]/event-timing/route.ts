import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart } from '@/lib/schemas/enterpriseSchemas';
import { findEventSignificators, findDashaChainWindows, refineWindowByTransit, refineDayByLagna, type DashaChainWindow, type DailyTransitMatch, type HourlyLagnaMatch } from '@/lib/kpAstro/eventTiming';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Caps how many dasha-chain windows get the (slower) day-by-day transit
// scan — the dasha-chain match alone is cheap, but transit refinement calls
// the ephemeris once per day per window, so this keeps a request bounded.
const MAX_WINDOWS_TO_REFINE = 8;

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
    const targetHouses: number[] = Array.isArray(body?.targetHouses)
      ? body.targetHouses.map(Number).filter((n: number) => n >= 1 && n <= 12)
      : [];
    if (targetHouses.length === 0) {
      return NextResponse.json({ error: 'targetHouses (array of house numbers 1-12) is required' }, { status: 400 });
    }

    const searchFrom = body?.searchFrom ? new Date(body.searchFrom) : new Date();
    const searchUntil = body?.searchUntil ? new Date(body.searchUntil) : new Date(searchFrom.getTime() + 10 * 365.25 * 86400000);

    // Optional — only needed for the final hour-level Lagna refinement.
    const latitude = body?.latitude !== undefined ? Number(body.latitude) : undefined;
    const longitude = body?.longitude !== undefined ? Number(body.longitude) : undefined;
    const utcOffsetHours = body?.utcOffsetHours !== undefined ? Number(body.utcOffsetHours) : undefined;
    const hasLagnaInputs = latitude !== undefined && longitude !== undefined && utcOffsetHours !== undefined
      && !Number.isNaN(latitude) && !Number.isNaN(longitude) && !Number.isNaN(utcOffsetHours);

    await connectDB();
    const KpHoroscopeChart = getKpHoroscopeChart();
    const chart = await (KpHoroscopeChart as any).findById(id).lean();
    if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 });

    const houses = chart.houses || [];
    const planets = chart.planets || [];
    const dashaPeriods = chart.dashaPeriods || [];

    const significators = findEventSignificators(houses, planets, targetHouses);
    if (significators.length === 0) {
      return NextResponse.json({
        success: true,
        data: { significators: [], windows: [] },
      }, { status: 200 });
    }

    const windows = findDashaChainWindows(dashaPeriods, significators, searchFrom, searchUntil);
    const significatorPlanetNames = significators.map((s) => s.planet);

    const refinedWindows: Array<DashaChainWindow & {
      transitMatches: DailyTransitMatch[];
      bestDate: string | null;
      lagnaRefinement: HourlyLagnaMatch[] | null;
    }> = [];
    for (const w of windows.slice(0, MAX_WINDOWS_TO_REFINE)) {
      const transitMatches = await refineWindowByTransit(w, significatorPlanetNames);

      let lagnaRefinement: Awaited<ReturnType<typeof refineDayByLagna>> | null = null;
      const bestDay = [...transitMatches].sort(
        (a, b) => (b.sunMatchStrength + b.moonMatchStrength) - (a.sunMatchStrength + a.moonMatchStrength)
      )[0];
      if (hasLagnaInputs && bestDay) {
        lagnaRefinement = await refineDayByLagna(
          new Date(bestDay.date), latitude as number, longitude as number, utcOffsetHours as number, significatorPlanetNames
        );
      }

      refinedWindows.push({ ...w, transitMatches, bestDate: bestDay?.date || null, lagnaRefinement });
    }

    return NextResponse.json({
      success: true,
      data: {
        targetHouses,
        significators,
        totalWindowsFound: windows.length,
        windows: refinedWindows,
        lagnaRefinementSkipped: !hasLagnaInputs,
      },
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute event timing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
