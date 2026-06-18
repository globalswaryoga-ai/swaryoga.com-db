import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const LANG_NAMES: Record<string, string> = {
  hi: 'Hindi', en: 'English', mr: 'Marathi', ne: 'Nepali',
  zh: 'Mandarin Chinese', es: 'Spanish', fr: 'French', ar: 'Arabic',
  de: 'German', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean',
  ru: 'Russian', it: 'Italian', tr: 'Turkish', nl: 'Dutch',
  sv: 'Swedish', th: 'Thai', id: 'Indonesian', multi: 'English',
};

/**
 * POST /api/cloud-translate
 * Translate text using Gemini AI.
 * Body: { text, sourceLang, targetLang }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Text and target language required' }, { status: 400 });
    }

    // Same language → return as-is
    if (sourceLang === targetLang) {
      return NextResponse.json({ success: true, translatedText: text });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Translation AI not configured (GEMINI_API_KEY missing)' }, { status: 503 });
    }

    const srcName = LANG_NAMES[sourceLang] || sourceLang || 'auto-detect';
    const tgtName = LANG_NAMES[targetLang] || targetLang;

    // gemini-2.0-flash's free-tier quota is now 0 (sunset) — confirmed live, 2.5-flash works.
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const systemPrompt = `You are a professional translator for a yoga & wellness CRM calling script system.
Translate the following text from ${srcName} to ${tgtName}.
Rules:
- Maintain the exact same formatting, line breaks, section headers (like "--- STAGE 1: OPENING ---"), bullet points, and template variables like {{leadName}}.
- Do NOT translate template variables (keep {{leadName}}, {{workshopName}} etc. as-is).
- Do NOT translate section markers (--- STAGE 1: OPENING ---, DO'S:, DON'TS:, RULES:, etc.) — keep them in English.
- Keep emojis like ✅ ❌ 📋 🙏 as-is.
- Use natural, conversational ${tgtName} appropriate for phone calls.
- Only output the translated text, nothing else.`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      console.error('[Translate Gemini Error]', data);
      return NextResponse.json({ error: data?.error?.message || 'Translation failed' }, { status: 500 });
    }

    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;

    return NextResponse.json({ success: true, translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}
