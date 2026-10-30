import { NextRequest, NextResponse } from 'next/server';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { parseAvatarScript } from '@/lib/avatarEmotionParser';
import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';

export const dynamic = 'force-dynamic';

const LANG_MAP: Record<string, string> = Object.fromEntries(
  ELEARNING_LANGUAGES.map((l) => [l.code, `${l.name} (${l.nativeName})`])
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const script = String(body.script || '').trim();
    const targetLang = String(body.targetLang || 'mr').toLowerCase();
    const mode = String(body.mode || 'strict_exact').toLowerCase(); // 'strict_exact' | 'expand_detail' | 'ebook_chapter'

    if (!script) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    const langName = LANG_MAP[targetLang] || targetLang;
    const inputLines = script.split('\n').filter((l) => l.trim().length > 0);
    const inputLineCount = Math.max(1, inputLines.length);

    let systemPrompt = '';

    if (mode === 'expand_detail') {
      systemPrompt = `You are an expert Vedic teacher expanding Mohan Sir's Swar Yoga teachings.
Translate and elaborate the core concept into ${langName} in 2 to 4 detailed, inspiring lines.
Maintain Mohan Sir's warm guru-like tone and sacred terminology (Swar Yoga, Ida, Pingala, Sushumna, Surya Swar, Chandra Swar).
Preserve any emotion tags like [smile], [namaste], [pause:1.5s] naturally.
Output ONLY the translated expanded text. No introductory remarks.`;
    } else if (mode === 'ebook_chapter') {
      systemPrompt = `You are a professional author converting Mohan Sir's spoken wisdom into an E-Book Chapter in ${langName}.
Format as a complete, multi-section book chapter:
# Chapter Title
## Core Vedic Sutra
[Detailed explanatory prose]
## Practical Sadhana Instructions
[Actionable bullet points]
## Chapter Summary
Output ONLY the chapter text in ${langName}.`;
    } else {
      // DEFAULT: STRICT EXACT 1:1 LENGTH PRESERVATION
      systemPrompt = `You are a professional Vedic multilingual translator for Swar Yoga lectures.
Translate the input script into ${langName}.

ABSOLUTE 1:1 LENGTH RULE (MANDATORY):
1. The input has ${inputLineCount} line(s). Your output MUST have EXACTLY ${inputLineCount} line(s).
2. If the user gives 1 line, you MUST return EXACTLY 1 line in ${langName}. NEVER inflate 1 line into 4-5 lines!
3. Do NOT add extra explanations, interpretations, background commentary, or alternative translations.
4. Translate meaning faithfully and concisely for spoken delivery by an avatar.

EMOTION & GESTURE SYMBOLS PRESERVATION:
5. STRICTLY PRESERVE all bracket tags exactly as they appear: [smile], [big_smile], [laugh], [curious], [serious], [teaching], [inspire], [namaste], [open_palms], [pointing_finger], [pause:X.Xs], [tag:XX].
6. Place the tags at the natural corresponding place in the ${langName} sentence so the digital avatar exhibits the exact same emotional expression.

SACRED TERMINOLOGY:
7. Keep sacred Swar Yoga terms accurate (स्वर योग / Swar Yoga, इड़ा / Ida, पिंगला / Pingala, सुषुम्ना / Sushumna, सूर्य स्वर / Surya Swar, चंद्र स्वर / Chandra Swar, प्राण / Prana, साधना / Sadhana).
8. Output ONLY the translated text with the bracket tags. Do NOT add quotes, markdown headers, or prefaces.`;
    }

    const translatedScript = await generateAIText({
      systemPrompt,
      message: script,
      maxOutputTokens: mode === 'ebook_chapter' ? 4000 : mode === 'expand_detail' ? 1200 : 800,
      temperature: mode === 'strict_exact' ? 0.15 : 0.4,
      providerOrder: ['OpenAI', 'Anthropic'],
    });

    const parsed = parseAvatarScript(translatedScript);

    return NextResponse.json({
      success: true,
      translatedScript: translatedScript.trim(),
      cleanText: parsed.fullCleanText,
      segments: parsed.segments,
      targetLang,
      mode,
    });
  } catch (error: any) {
    console.error('Avatar translation error:', error);
    return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}
