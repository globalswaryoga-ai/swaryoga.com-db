import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart } from '@/lib/schemas/enterpriseSchemas';
import { buildFinalPredictionPrompt } from '@/lib/kpAstro/buildFinalPredictionPrompt';
import { callAI } from '@/lib/kpAstro/aiClient';
import { KP_LANGUAGE_CODES } from '@/lib/kpAstro/languages';

export const dynamic = 'force-dynamic';

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
    const language: string = KP_LANGUAGE_CODES.includes(body?.language) ? body.language : 'hi';

    await connectDB();

    const KpHoroscopeChart = getKpHoroscopeChart();
    const chart = await (KpHoroscopeChart as any).findById(id).lean();
    if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 });

    const bhavRows = Array.isArray(chart.bhavAnalysis) ? chart.bhavAnalysis : [];
    const hasContent = (b: any) =>
      b.subLord || b.positiveNotes || b.negativeNotes || b.dashaNotes || b.freeNotes ||
      b.subLordAbcdPlanets || b.subLordKaryeshBhav || b.subLordRahuKetuConnection ||
      b.subLordDrishti || b.subLordConjunction || b.dashaChain ||
      b.toolkitMatter || b.toolkitPrimaryHouse || b.toolkitSupportingHouses || b.toolkitOpposingHouses ||
      b.cslRetrogradeStatus || b.cslStarLord || b.cslStarLordOwner || b.cslStarLordRetrogradeStatus ||
      b.cslStarLordSignification || b.karyeshRuleResult || b.karyeshRuleConclusion ||
      (b.customMatters && b.customMatters.length) ||
      (b.drishtiPlanets && b.drishtiPlanets.length) || (b.connectionPlanets && b.connectionPlanets.length) ||
      (b.significatorsA && b.significatorsA.length) || (b.significatorsB && b.significatorsB.length) ||
      (b.significatorsC && b.significatorsC.length) || (b.significatorsD && b.significatorsD.length);

    const hasAnyContent = bhavRows.some((b: any) =>
      hasContent(b)
    );
    if (!hasAnyContent) {
      return NextResponse.json({ error: 'No bhav analysis saved yet. Work through the Astrologer Workspace before generating a final prediction.' }, { status: 400 });
    }

    const orderedBhavs = bhavRows
      .filter((b: any) => b.includeInPrediction !== false && hasContent(b))
      .sort((a: any, b: any) => (a.predictionOrder || 0) - (b.predictionOrder || 0) || a.house - b.house);

    const currentMahadasha = Array.isArray(chart.mahadashas)
      ? chart.mahadashas.find((m: any) => new Date(m.startDate) <= new Date() && new Date() < new Date(m.endDate))
      : undefined;

    const systemPrompt = buildFinalPredictionPrompt({
      personName: chart.personName,
      dob: chart.dob,
      gender: chart.gender,
      language,
      lifeStageNotes: chart.lifeStageNotes || '',
      orderedBhavs,
      currentMahadasha,
      // Cusp positions let the prompt pull the curated rulebook texts
      // (mindset/diseases/profession) matched to this chart's sub lords.
      houses: Array.isArray(chart.houses)
        ? chart.houses.map((h: any) => ({ house: h.house, sign: h.sign, star: h.star, subLord: h.subLord }))
        : undefined,
    });

    const reportText = await callAI(systemPrompt, [], 'Generate the final prediction now.', 4000);

    const updated = await (KpHoroscopeChart as any).findByIdAndUpdate(
      id,
      { $push: { reports: { language, reportType: 'final', text: reportText, generatedAt: new Date() } } },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: { language, text: reportText, generatedAt: new Date(), chart: updated } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate final prediction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
