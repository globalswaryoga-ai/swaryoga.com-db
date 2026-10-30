import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { generateAIText } from '@/lib/ai/generateWithFallback';

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
    const language = String(body?.language || 'auto');
    if (!content.trim()) return NextResponse.json({ error: 'Add or import text before checking spelling.' }, { status: 400 });
    if (content.length > 500_000) return NextResponse.json({ error: 'Text exceeds the 500,000 character review limit.' }, { status: 413 });
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Choose Auto, English, Hindi, or Marathi.' }, { status: 400 });

    const resolvedLanguage = language === 'auto'
      ? /[\u0900-\u097f]/.test(content) ? 'Hindi, Marathi, or Sanskrit in Devanagari; preserve the original language variety' : 'the source language; preserve its original language'
      : ({ en: 'English', hi: 'Hindi in Devanagari', mr: 'Marathi in Devanagari' } as Record<string, string>)[language];
    const chunks = splitIntoReviewChunks(content);
    const corrected: string[] = [];
    for (const chunk of chunks) {
      corrected.push(await generateAIText({
        providerOrder: ['OpenAI', 'Anthropic'],
        temperature: 0.1,
        maxOutputTokens: 8192,
        systemPrompt: `Proofread every word in this source text in ${resolvedLanguage}. Correct spelling, Hindi matras/nukta, punctuation, OCR or speech-recognition misspellings, and accidental spaces or breaks inside words. Keep the original language, script, meaning, sequence, teaching style, headings, lists, timestamps, page labels, names, numbers, and bracketed avatar/emotion tags. Never translate, summarize, rewrite, remove a teaching, or add facts or explanations. Use Swar Yoga terms consistently when the context is clear: स्वर योग, स्वरोदय, नाड़ी (correct “नाड्य का परिचय” to “नाड़ी का परिचय”), इड़ा, पिंगला, सुषुम्ना, प्राण, नासिका, सूर्य स्वर, चंद्र स्वर, समाधि. Correct other clear errors throughout; preserve a technical word if its intended correction is genuinely uncertain. Return only the complete corrected text, retaining paragraph and page breaks.`,
        message: `Check the entire passage word by word and return the complete corrected passage, not a summary:\n\n${chunk}`,
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
