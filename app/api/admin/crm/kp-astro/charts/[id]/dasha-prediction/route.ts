import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart, getKpRuleBookEntry } from '@/lib/schemas/enterpriseSchemas';
import { evaluateChainForAllMatters, findConfirmingBhuktis, type RuleBookMatterInput } from '@/lib/kpAstro/dashaPrediction';

export const dynamic = 'force-dynamic';

function guard(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isSuperAdmin(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 }) };
  }
  return { decoded };
}

async function loadChartAndRules(id: string) {
  await connectDB();
  const KpHoroscopeChart = getKpHoroscopeChart();
  const chart = await (KpHoroscopeChart as any).findById(id).lean();
  if (!chart) return { error: NextResponse.json({ error: 'Chart not found' }, { status: 404 }) };

  const KpRuleBookEntry = getKpRuleBookEntry();
  const rules: RuleBookMatterInput[] = await (KpRuleBookEntry as any).find({}).lean();

  return {
    houses: chart.houses || [],
    planets: chart.planets || [],
    bhavAnalysis: chart.bhavAnalysis || [],
    dashaPeriods: chart.dashaPeriods || [],
    dob: chart.dob ? new Date(chart.dob) : null,
    rules,
  };
}

/**
 * GET /api/admin/crm/kp-astro/charts/[id]/dasha-prediction
 * Mahadasha-level overview: for each Mahadasha window, which Rule Book
 * matters are indicated by that Mahadasha lord alone (natal green-signal
 * check included). Cheap -- there are only ~6-9 Mahadashas in a cycle.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const loaded = await loadChartAndRules(id);
    if ('error' in loaded) return loaded.error;
    const { houses, planets, bhavAnalysis, dashaPeriods, dob, rules } = loaded;

    const mahaRows = dashaPeriods
      .filter((r: any) => r.level === 'maha')
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const overview = mahaRows.map((row: any) => {
      const antarRows = dashaPeriods.filter((r: any) => r.level === 'antar' && r.parentPath === row.planet);
      const ageContext = dob ? { dob, periodStart: new Date(row.startDate), periodEnd: new Date(row.endDate) } : undefined;
      const matches = evaluateChainForAllMatters(houses, planets, bhavAnalysis, rules, [row.planet], ageContext).map((m) => ({
        ...m,
        confirmingBhuktis: m.primaryHouse
          ? findConfirmingBhuktis(houses, planets, row.planet, antarRows, m.primaryHouse, m.denialHouses, m.category, m.subMatter, dob)
          : [],
      }));
      return { planet: row.planet, startDate: row.startDate, endDate: row.endDate, matches };
    });

    return NextResponse.json({ success: true, data: { overview } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute Dasha overview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/kp-astro/charts/[id]/dasha-prediction
 * Evaluates one specific running chain (whatever levels the astrologer has
 * drilled into in the UI -- e.g. [mahaLord, antarLord, pratyantarLord]).
 * Body: { chainPlanets: string[] }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const chainPlanets: string[] = Array.isArray(body?.chainPlanets) ? body.chainPlanets.filter((p: any) => typeof p === 'string' && p) : [];
    if (chainPlanets.length === 0) {
      return NextResponse.json({ error: 'chainPlanets (array of planet names) is required' }, { status: 400 });
    }
    // Age-gate needs to know how old the native is DURING this specific
    // period -- the caller (whatever selected this chain in the UI) knows
    // that period's own date range, e.g. the deepest drilled-into level's
    // start/end, or the chosen Bhukti's start/end.
    const periodStart = body?.periodStart ? new Date(body.periodStart) : null;
    const periodEnd = body?.periodEnd ? new Date(body.periodEnd) : null;

    const loaded = await loadChartAndRules(id);
    if ('error' in loaded) return loaded.error;
    const { houses, planets, bhavAnalysis, dob, rules } = loaded;

    const ageContext = dob && periodStart && periodEnd ? { dob, periodStart, periodEnd } : undefined;
    const matches = evaluateChainForAllMatters(houses, planets, bhavAnalysis, rules, chainPlanets, ageContext);

    return NextResponse.json({ success: true, data: { chainPlanets, matches } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate Dasha chain';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
