import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart } from '@/lib/schemas/enterpriseSchemas';
import { buildChartContext } from '@/lib/kpAstro/buildChartContext';
import { callAI, type ChatTurn } from '@/lib/kpAstro/aiClient';

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
    const message = String(body?.message || '').trim();
    const history: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];
    const language: string = ['hi', 'mr', 'en'].includes(body?.language) ? body.language : 'hi';

    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    await connectDB();

    const KpHoroscopeChart = getKpHoroscopeChart();
    const chart = await (KpHoroscopeChart as any).findById(id).lean();
    if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 });

    const context = buildChartContext(chart);

    const systemPrompt = `You are a KP astrology assistant helping the admin astrologer interpret a specific client's chart in depth, beyond the standard generated reading.

CHART DATA (ground truth — do not invent planetary facts beyond it):
${context}

RULES:
- Answer in ${LANGUAGE_NAMES[language]} unless the astrologer's question is in a different language, in which case match their language.
- Ground every answer in the data above (houses, sub lords, planets, Mahadasha, doshas). If the question needs data not provided, say so and suggest what's missing.
- Speak to the astrologer (not the client) — you can be technical about KP rules, sub lords, and significators.
- Keep answers focused; expand only if the astrologer asks for detail.`;

    const reply = await callAI(systemPrompt, history, message, 1200);

    await (KpHoroscopeChart as any).findByIdAndUpdate(id, {
      $push: {
        chatHistory: {
          $each: [
            { role: 'user', content: message, createdAt: new Date() },
            { role: 'assistant', content: reply, createdAt: new Date() },
          ],
        },
      },
    });

    return NextResponse.json({ success: true, reply }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
