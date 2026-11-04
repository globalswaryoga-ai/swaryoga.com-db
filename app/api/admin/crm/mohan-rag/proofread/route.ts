import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { generateAIText } from '@/lib/ai/generateWithFallback';

import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function requireMohanRagAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch { return null; }
}

function splitIntoReviewChunks(text: string, limit = 8_000): string[] {
  const paragraphs = text.match(/[^\n]*(?:\n|$)/g)?.filter(Boolean) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (paragraph.length > limit) {
      if (current) { chunks.push(current); current = ''; }
      for (let offset = 0; offset < paragraph.length; offset += limit) chunks.push(paragraph.slice(offset, offset + limit));
      continue;
    }
    if (current.length + paragraph.length > limit) { chunks.push(current); current = ''; }
    current += paragraph;
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function POST(request: NextRequest) {
  if (!requireMohanRagAdmin(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content : '';
    const language = String(body?.language || 'auto').toLowerCase();
    if (!content.trim()) return NextResponse.json({ error: 'Add or import text before checking spelling.' }, { status: 400 });
    if (content.length > 500_000) return NextResponse.json({ error: 'Text exceeds the 500,000 character review limit.' }, { status: 413 });

    const langObj = ELEARNING_LANGUAGES.find(l => l.code === language);
    const resolvedLanguage = language === 'auto'
      ? (/[\u0900-\u097f]/.test(content) ? 'Hindi, Marathi, or Sanskrit in Devanagari' : 'the source language; preserve its original script and language')
      : (langObj ? `${langObj.name} (${langObj.nativeName})` : language);

    const chunks = splitIntoReviewChunks(content);
    const corrected: string[] = [];
    for (const chunk of chunks) {
      corrected.push(await generateAIText({
        providerOrder: ['Gemini', 'OpenAI', 'Anthropic', 'Groq'],
        temperature: 0.1,
        maxOutputTokens: 8192,
        systemPrompt: `CRITICAL INSTRUCTION - TARGET LANGUAGE CONVERSION & SPELL CHECKING:
The mandatory target language is: ${resolvedLanguage} (language code: ${language}).

MANDATORY RULES:
1. COMPLETE TARGET LANGUAGE CONVERSION:
   - Every single word, sentence, heading, outline, and explanation MUST be rendered in ${resolvedLanguage}.
   - If the incoming input text is in Marathi, Hindi, English, or any other language different from ${resolvedLanguage}, you MUST convert/translate it completely into natural, fluent, native ${resolvedLanguage} (for Japanese: use natural kanji, hiragana, and katakana; for European languages: use proper native orthography; for Indian languages: use native scripts).
   - Under NO circumstance should any source Marathi or English sentences remain unconverted in the final output (except the sacred Vedic terms listed below).
2. RIGOROUS SPELL & ORTHOGRAPHY CHECKING:
   - Verify character integrity, spelling, kanji/kana, matras, accents, and punctuation in ${resolvedLanguage}.
3. STRICT SACRED VEDIC TERMS PRESERVATION (DO NOT DISTORT OR SUBSTITUTE WITH SYNONYMS):
   - Swar Yoga (スワル・ヨガ / स्वर योग)
   - Ida Nadi / Chandra Swara (イダー・ナーディー / चंद्र स्वर / डावी नाकपुडी)
   - Pingala Nadi / Surya Swara (ピンガラ・ナーディー / सूर्य स्वर / उजवी नाकपुडी)
   - Sushumna Nadi (スシュムナー・ナーディー / सुषुम्ना नाडी)
   - Prana (プラーナ / प्राण)
   - Kumbhaka (クンバカ / कुंभक)
   - Chakras (チャクラ)
   - Samadhi (サマーディ / समाधि)
   - Pancha Mahabhuta / Tatva (パンチャ・マハーブータ / पंचमहाभूत)
4. GRAMMAR (VERBS ONLY):
   - Adjust ONLY verbs to agree with subject/object syntax (SOV for Japanese, Hindi, Marathi, etc.; SVO for English, French, Spanish, German, etc.).
   - NEVER alter sacred nouns or objects.
5. Retain all layout structure, headings, bullet lists, timestamps, and bracketed avatar cues [CALM], [EXPLAINING], [PAUSE], [HUMOROUS], [SMILING], [INSPIRATIONAL], [SERIOUS], etc.
6. Return ONLY the complete text in ${resolvedLanguage}, without any conversational preamble, notes, or markdown code fences (\`\`\`).`,
        message: `Convert all incoming data and spell check this text into ${resolvedLanguage}. Ensure ALL sentences are completely in native ${resolvedLanguage} with sacred Vedic terms preserved:\n\n${chunk}`,
      }));
    }
    let correctedText = corrected.join('');
    // This phrase is a common OCR/transcription misspelling in the Swar Yoga
    // syllabus; correct it explicitly rather than treating it as an unknown term.
    if (language === 'hi' || language === 'mr' || language === 'auto') {
      correctedText = correctedText.replace(/नाड्य(?=\s+का\s+परिचय)/gu, 'नाड़ी');
    }
    if (!correctedText.trim()) throw new Error('Spell check returned empty text; your source was not changed.');
    return NextResponse.json({ success: true, correctedText, chunksReviewed: chunks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not check spelling';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
