import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoraryChart } from '@/lib/schemas/enterpriseSchemas';
import { buildHoraryJudgmentPrompt } from '@/lib/kpAstro/buildHoraryJudgmentPrompt';
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

    const KpHoraryChart = getKpHoraryChart();
    const chart = await (KpHoraryChart as any).findById(id).lean();
    if (!chart) return NextResponse.json({ error: 'Horary chart not found' }, { status: 404 });

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
      return NextResponse.json({ error: 'No bhav analysis saved yet. Work through the Horary Workspace before generating a judgment.' }, { status: 400 });
    }

    const systemPrompt = buildHoraryJudgmentPrompt({
      questionText: chart.questionText,
      querentName: chart.querentName,
      language,
      rulingPlanets: chart.rulingPlanets,
      orderedBhavs,
    });

    const reportText = await callAI(systemPrompt, [], 'Deliver the horary judgment now.', 2000);

    const updated = await (KpHoraryChart as any).findByIdAndUpdate(
      id,
      { $push: { reports: { language, text: reportText, generatedAt: new Date() } } },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: { language, text: reportText, generatedAt: new Date(), chart: updated } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate horary judgment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
