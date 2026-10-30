import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  ELEARNING_LANGUAGES.map((l) => [l.code, l.name])
);

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      sourceText,
      sourceLanguage = 'hi',
      targetLanguages = ['en'],
      mode = 'lecture', // 'lecture' (30m) | 'summary' (10m) | 'short' (60s)
      insertMarkers = true,
      topicTitle = 'Swar Yoga Session',
    } = body;

    if (!sourceText || !sourceText.trim()) {
      return NextResponse.json({ error: 'sourceText is required' }, { status: 400 });
    }

    const sourceName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
    const results: Array<{ language: string; languageName: string; text: string }> = [];

    for (const targetLang of targetLanguages) {
      const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

      const prompt = `You are a professional multi-language translator and dialogue adapter.
Source Language: ${sourceName}.
Target Language: ${targetName}.

Task:
Translate the source text from ${sourceName} into ${targetName}.

STRICT RULES (CRITICAL):
1. EXACT LENGTH MATCH: Translate ONLY what the user provided.
   - If the input is 1 line, output ONLY that 1 line translated into ${targetName}.
   - If the input is 1 sentence, output ONLY 1 sentence.
   - If the input is a full lecture, translate the full lecture.
   - NEVER invent new content, extra paragraphs, yoga lectures, or topics that are NOT present in the input text.
2. NATURAL GRAMMAR & CONVERSATIONAL TONE ("THEIR WAY OF TALK"):
   - Translate with perfect native grammar and colloquial rhythm so it sounds completely natural and respectful when spoken aloud in ${targetName}.
   - Maintain the speaker's original voice, style, and intent.
3. OUTPUT ONLY:
   - Output ONLY the final translated text in ${targetName}.
   - Do NOT add labels like "Translation:", do NOT add notes, do NOT add English explanations, and do NOT add scene markers unless explicitly part of the source.
   - The first character of your response must be the first word of the translation.

Source Text:
${sourceText.trim()}`;

      const scriptText = await generateAIText({
        message: prompt,
        maxOutputTokens: 8192,
        providerOrder: ['OpenAI', 'Anthropic'],
      });

      results.push({
        language: targetLang,
        languageName: targetName,
        text: scriptText.trim(),
      });
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
