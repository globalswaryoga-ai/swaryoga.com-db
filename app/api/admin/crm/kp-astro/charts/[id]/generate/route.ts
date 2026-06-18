import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart } from '@/lib/schemas/enterpriseSchemas';
import { buildChartContext, buildSectionPromptList } from '@/lib/kpAstro/buildChartContext';
import { callAI } from '@/lib/kpAstro/aiClient';

export const dynamic = 'force-dynamic';

const LANGUAGE_NAMES: Record<string, string> = { hi: 'Hindi', mr: 'Marathi', en: 'English' };

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
    const language: string = ['hi', 'mr', 'en'].includes(body?.language) ? body.language : 'hi';

    await connectDB();

    const KpHoroscopeChart = getKpHoroscopeChart();
    const chart = await (KpHoroscopeChart as any).findById(id).lean();
    if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 });

    const context = buildChartContext(chart);
    const sectionList = buildSectionPromptList();

    const systemPrompt = `You are a KP (Krishnamurti Paddhati) astrology assistant writing a personalized horoscope reading for an admin astrologer at Swar Yoga to share with their client ("sadhak").

CHART DATA (manually entered by the astrologer from their chart-casting software — treat this as ground truth, do not invent any planetary facts beyond it):
${context}

TASK: Write the full reading entirely in ${LANGUAGE_NAMES[language]}, addressing the reader as "sadhak" (or the ${LANGUAGE_NAMES[language]} equivalent), in a warm, respectful, personal tone — similar to how a trusted family astrologer would write.

Cover exactly these sections, in this order, each with its own clear heading:
${sectionList}

RULES:
- Ground every statement in the house/sub-lord/planet/Mahadasha data given above. When you reference a house or sub lord, briefly say why (e.g. "your 2nd house Sub Lord is X, connected to Y").
- For the Mahadasha-related sections, mention both the current Mahadasha and what changes when the next one begins (with its start date), using the dates given.
- Only mention gemstones if the data suggests a weak/afflicted planet — and only recommend from the supplied gemstone reference table.
- Only mention dosha remedies for doshas explicitly flagged as present — use the supplied remedy reference text, do not invent remedies.
- If the data is insufficient for a section (e.g. a required house wasn't filled in), say so briefly rather than guessing.
- Keep each section to a focused paragraph (3-6 sentences), not an essay.`;

    const reportText = await callAI(systemPrompt, [], 'Generate the horoscope reading now.', 4000);

    const updated = await (KpHoroscopeChart as any).findByIdAndUpdate(
      id,
      { $push: { reports: { language, text: reportText, generatedAt: new Date() } } },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: { language, text: reportText, generatedAt: new Date(), chart: updated } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
