import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart } from '@/lib/schemas/enterpriseSchemas';
import { computeAgeMilestones } from '@/lib/kpAstro/ageTimeline';
import { buildAgeTimelinePredictionPrompt } from '@/lib/kpAstro/buildAgeTimelinePredictionPrompt';
import { callAI } from '@/lib/kpAstro/aiClient';
import { KP_LANGUAGE_CODES } from '@/lib/kpAstro/languages';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

    if (!chart.dob) {
      return NextResponse.json({ error: 'This chart has no date of birth saved — required to compute the age timeline.' }, { status: 400 });
    }
    if (!Array.isArray(chart.mahadashas) || chart.mahadashas.length === 0) {
      return NextResponse.json({ error: 'No Mahadasha periods saved on this chart. Recalculate from Data Entry first.' }, { status: 400 });
    }

    const bhavRows = Array.isArray(chart.bhavAnalysis) ? chart.bhavAnalysis : [];
    const hasContent = (b: any) =>
      b.subLord || b.positiveNotes || b.negativeNotes || b.dashaNotes || b.freeNotes ||
      (b.customMatters && b.customMatters.length) ||
      (b.significatorsA && b.significatorsA.length) || (b.significatorsB && b.significatorsB.length) ||
      (b.significatorsC && b.significatorsC.length) || (b.significatorsD && b.significatorsD.length);

    const orderedBhavs = bhavRows
      .filter((b: any) => b.includeInPrediction !== false && hasContent(b))
      .sort((a: any, b: any) => (a.predictionOrder || 0) - (b.predictionOrder || 0) || a.house - b.house);

    if (orderedBhavs.length === 0) {
      return NextResponse.json({ error: 'No bhav analysis saved yet. Work through the Astrologer Workspace before generating the life timeline.' }, { status: 400 });
    }

    const milestones = computeAgeMilestones(chart.dob, chart.mahadashas, chart.dashaPeriods);

    const systemPrompt = buildAgeTimelinePredictionPrompt({
      personName: chart.personName,
      dob: chart.dob,
      gender: chart.gender,
      language,
      lifeStageNotes: chart.lifeStageNotes || '',
      orderedBhavs,
      milestones,
    });

    const reportText = await callAI(systemPrompt, [], 'Generate the full age 5-80 life timeline prediction now.', 6000);

    const updated = await (KpHoroscopeChart as any).findByIdAndUpdate(
      id,
      { $push: { reports: { language, reportType: 'timeline', text: reportText, generatedAt: new Date() } } },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: { language, text: reportText, generatedAt: new Date(), milestones, chart: updated } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate life timeline prediction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
