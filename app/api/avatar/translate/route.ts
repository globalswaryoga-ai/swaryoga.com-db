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
    } else if (mode === 'strict_exact' && inputLineCount <= 2) {
      // 1:1 line preservation for short avatar dialog lines
      systemPrompt = `You are a professional Vedic multilingual translator for Swar Yoga lectures.
Translate the input script into ${langName}.

ABSOLUTE 1:1 LENGTH RULE:
1. The input has ${inputLineCount} line(s). Your output MUST have EXACTLY ${inputLineCount} line(s).
2. Translate meaning faithfully and concisely for spoken delivery by an avatar.
3. PRESERVE all bracket tags exactly as they appear: [smile], [laugh], [serious], [teaching], [inspire], [pause:X.Xs], [CALM], [EXPLAINING], [EMPHASIS], [HUMOROUS].
4. Keep sacred Swar Yoga terms accurate.
5. Output ONLY the translated line(s). No markdown fences, no prefaces.`;
    } else {
      // MASTER KNOWLEDGE & FULL DOCUMENT TRANSLATION (Default for Library, Corpus & Workshops)
      systemPrompt = `You are a master Vedic scholar and professional multilingual translator specializing in Shri Mohan Kalburgi's Swar Yoga teachings.
Translate the complete input text faithfully into authentic native ${langName}.

CORE TRANSLATION MANDATES:
1. 100% COMPLETE FAITHFUL TRANSLATION:
   - Translate all paragraphs, bullet points, explanations, examples, and stories into fluent, natural, grammatically correct ${langName}.
   - Do NOT summarize, shorten, condense, or omit any content. Keep 100% of the teaching intact.
   - For Japanese: use authentic Japanese phrasing (敬語 / 丁寧語), natural kanji, hiragana, and katakana.
   - For Hindi/Marathi/Kannada/Russian/Spanish/German/etc.: use natural native vocabulary and idioms.

2. SACRED YOGIC TERMINOLOGY:
   - Preserve sacred Vedic terminology with utmost reverence:
     • Swar Yoga (स्वर योग)
     • Ida Nadi / Chandra Swara (इडा नाडी / चंद्र स्वर)
     • Pingala Nadi / Surya Swara (पिंगळा नाडी / सूर्य स्वर)
     • Sushumna Nadi (सुषुम्ना नाडी)
     • Pranayama & Kumbhaka (प्राणायाम व कुंभक)
     • Pancha Mahatattva (पंच महातत्त्व)
   - In target language, use standard native yogic script accompanied by transliteration where appropriate.

3. STRUCTURE & BRACKET EMOTION TAGS:
   - Preserve all headings, dividers, and bullet lists.
   - If the input contains bracketed emotion or delivery tags ([CALM], [EXPLAINING], [EMPHASIS], [PAUSE: 2 SECONDS], [HUMOROUS], [SMILING], [INSPIRATIONAL], [SERIOUS], [face:...], [gesture:...]):
     KEEP them positioned before their corresponding sentences in ${langName}.

4. CLEAN OUTPUT:
   - Output ONLY the translated content. Do NOT include markdown code fences (\`\`\`), do NOT output "Here is the translation".`;
    }

    // Handle long scripts via chunking to avoid context truncation
    let resultText = '';
    if (script.length <= 8000) {
      const translated = await generateAIText({
        systemPrompt,
        message: script,
        maxOutputTokens: mode === 'ebook_chapter' ? 4000 : mode === 'expand_detail' ? 2000 : 4000,
        temperature: mode === 'strict_exact' ? 0.15 : 0.3,
        providerOrder: ['OpenAI', 'Anthropic', 'Groq', 'Gemini'],
      });
      resultText = translated.replace(/^```(?:text)?\s*|\s*```$/g, '').trim();
    } else {
      const paragraphs = script.split(/\n\n+/);
      const chunks: string[] = [];
      let current = '';
      for (const para of paragraphs) {
        if (current.length + para.length > 7000) {
          if (current) chunks.push(current.trim());
          current = para;
        } else {
          current = current ? `${current}\n\n${para}` : para;
        }
      }
      if (current.trim()) chunks.push(current.trim());

      const translatedChunks: string[] = [];
      for (const chunk of chunks) {
        const trans = await generateAIText({
          systemPrompt,
          message: chunk,
          maxOutputTokens: 4000,
          temperature: 0.2,
          providerOrder: ['OpenAI', 'Anthropic', 'Groq', 'Gemini'],
        });
        translatedChunks.push(trans.replace(/^```(?:text)?\s*|\s*```$/g, '').trim());
      }
      resultText = translatedChunks.join('\n\n');
    }

    const parsed = parseAvatarScript(resultText);

    return NextResponse.json({
      success: true,
      translatedText: resultText,
      translatedScript: resultText,
      cleanText: parsed.fullCleanText || resultText,
      segments: parsed.segments,
      targetLang,
      mode,
    });
  } catch (error: any) {
    console.error('Avatar translation error:', error);
    return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}
