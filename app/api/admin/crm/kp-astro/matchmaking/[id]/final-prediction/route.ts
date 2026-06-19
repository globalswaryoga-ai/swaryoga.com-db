import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpMatchMaking } from '@/lib/schemas/enterpriseSchemas';
import { buildMatchmakingPrompt } from '@/lib/kpAstro/buildMatchmakingPrompt';
import { callAI } from '@/lib/kpAstro/aiClient';
import { KP_LANGUAGE_CODES } from '@/lib/kpAstro/languages';

export const dynamic = 'force-dynamic';

function orderRows(rows: any[]) {
  const hasContent = (b: any) =>
    b.subLord || b.positiveNotes || b.negativeNotes || b.dashaNotes || b.freeNotes ||
    b.subLordAbcdPlanets || b.subLordKaryeshBhav || b.subLordRahuKetuConnection ||
    b.subLordDrishti || b.subLordConjunction || b.dashaChain ||
    (b.customMatters && b.customMatters.length) ||
    (b.drishtiPlanets && b.drishtiPlanets.length) || (b.connectionPlanets && b.connectionPlanets.length) ||
    (b.significatorsA && b.significatorsA.length) || (b.significatorsB && b.significatorsB.length) ||
    (b.significatorsC && b.significatorsC.length) || (b.significatorsD && b.significatorsD.length);
  return (Array.isArray(rows) ? rows : [])
    .filter((b: any) => b.includeInPrediction !== false && hasContent(b))
    .sort((a: any, b: any) => (a.predictionOrder || 0) - (b.predictionOrder || 0) || a.house - b.house);
}

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
      return NextResponse.json({ error: 'Invalid record id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const language: string = KP_LANGUAGE_CODES.includes(body?.language) ? body.language : 'hi';

    await connectDB();

    const KpMatchMaking = getKpMatchMaking();
    const record = await (KpMatchMaking as any).findById(id).populate('groomChartId', 'personName').populate('brideChartId', 'personName').lean();
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const groomBhavs = orderRows(record.groomBhavAnalysis);
    const brideBhavs = orderRows(record.brideBhavAnalysis);

    if (groomBhavs.length === 0 && brideBhavs.length === 0) {
      return NextResponse.json({ error: 'No bhav analysis saved for either partner yet. Work through the Matchmaking Workspace first.' }, { status: 400 });
    }

    const systemPrompt = buildMatchmakingPrompt({
      groomName: record.groomChartId?.personName || 'Groom',
      brideName: record.brideChartId?.personName || 'Bride',
      language,
      compatibilityNotes: record.compatibilityNotes || '',
      groomBhavs,
      brideBhavs,
    });

    const reportText = await callAI(systemPrompt, [], 'Generate the match-making prediction now.', 4000);

    const updated = await (KpMatchMaking as any).findByIdAndUpdate(
      id,
      { $push: { reports: { language, text: reportText, generatedAt: new Date() } } },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: { language, text: reportText, generatedAt: new Date(), record: updated } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate match-making prediction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
