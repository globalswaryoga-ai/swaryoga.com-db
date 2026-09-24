import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { computeChart } from '@/lib/kpAstro/ephemeris';
import { computeVimshottariDasha, computeDashaTree } from '@/lib/kpAstro/vimshottariDasha';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Parses "+5:30" / "-5" / "5.5" into decimal hours.
function parseUtcOffset(value: string): number | null {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(/^([+-]?)(\d+)(?::(\d+))?$/);
  if (!match) return null;
  const [, sign, hours, minutes] = match;
  const decimal = Number(hours) + (minutes ? Number(minutes) / 60 : 0);
  return sign === '-' ? -decimal : decimal;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as any));
    const { dob, birthTime, utcOffset, latitude, longitude } = body || {};

    if (!dob || !birthTime || utcOffset === undefined || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'dob, birthTime, utcOffset, latitude, and longitude are required' }, { status: 400 });
    }

    const utcOffsetHours = parseUtcOffset(String(utcOffset));
    if (utcOffsetHours === null) {
      return NextResponse.json({ error: 'utcOffset must look like "+5:30" or "-5"' }, { status: 400 });
    }

    const [year, month, day] = String(dob).split('-').map(Number);
    const [hour, minute] = String(birthTime).split(':').map(Number);
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
      return NextResponse.json({ error: 'Invalid dob or birthTime format' }, { status: 400 });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json({ error: 'latitude/longitude must be numbers' }, { status: 400 });
    }

    const chart = await computeChart({ year, month, day, hour, minute, utcOffsetHours, latitude: lat, longitude: lon });

    const moon = chart.planets.find((p) => p.planet === 'Moon');
    const birthDate = new Date(Date.UTC(year, month - 1, day, hour - utcOffsetHours, minute));
    const mahadashas = moon ? computeVimshottariDasha(moon.siderealLongitude, birthDate) : [];
    // Eager Maha->Antar->Pratyantar tree (819 rows/cycle); Sookshma/Prana are
    // computed on-demand later since their count explodes (59,000+ for a lifetime).
    const dashaPeriods = moon ? computeDashaTree(moon.siderealLongitude, birthDate, 'pratyantar', 1) : [];

    return NextResponse.json({
      success: true,
      data: {
        ascendant: { sign: chart.ascendant.sign, degree: chart.ascendant.degree },
        houses: chart.houses.map((h) => ({
          house: h.house, sign: h.sign, signLord: h.signLord, star: h.star, starLord: h.starLord, subLord: h.subLord, degree: h.degree,
        })),
        planets: chart.planets.map((p) => ({
          planet: p.planet, sign: p.sign, star: p.star, subLord: p.subLord, house: p.house, degree: p.degree, retrograde: p.retrograde, combust: p.combust,
        })),
        fortuna: {
          sign: chart.fortuna.sign, signLord: chart.fortuna.signLord, star: chart.fortuna.star,
          starLord: chart.fortuna.starLord, subLord: chart.fortuna.subLord, house: chart.fortuna.house, degree: chart.fortuna.degree,
          _debugLongitude: (chart.fortuna as any).siderealLongitude,
        },
        mahadashas,
        dashaPeriods,
      },
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate chart';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
