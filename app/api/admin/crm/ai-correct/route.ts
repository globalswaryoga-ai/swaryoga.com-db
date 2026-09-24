import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/ai-correct
 * AI-powered spelling + grammar correction using Claude API.
 *
 * Body: { text: string }
 * Response: { success: true, correctedText: string }
 */

function basicAutocorrect(text: string): string {
  // Keep this conservative and deterministic. It's only a fallback when Claude isn't configured.
  const replacements: Array<[RegExp, string]> = [
    [/\bhelo\b/gi, 'hello'],
    [/\bwrld\b/gi, 'world'],
    [/\bthier\b/gi, 'their'],
    [/\bwich\b/gi, 'which'],
    [/\brecieve\b/gi, 'receive'],
    [/\boccured\b/gi, 'occurred'],
    [/\bbegining\b/gi, 'beginning'],
    [/\bseperete\b/gi, 'separate'],
    [/\bcongradulate\b/gi, 'congratulate'],
    [/\bsuccesful\b/gi, 'successful'],
    [/\bwiht\b/gi, 'with'],
  ];

  let out = String(text ?? '');
  for (const [re, rep] of replacements) out = out.replace(re, rep);
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const text = body?.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json({ success: true, correctedText: '' }, { status: 200 });
    }

    // AI pass — same Gemini→Anthropic→OpenAI fallback chain used everywhere
    // else in this codebase, instead of a single pinned-model Anthropic call
    // that hard-failed to the tiny 11-entry regex fallback on any Claude hiccup.
    try {
      const raw = await generateAIText({
        systemPrompt:
          'You are a spelling and grammar correction assistant for WhatsApp/CRM template text used by a yoga & wellness studio. ' +
          'Messages may mix English with Hindi/Hinglish written in Latin script — do not "correct" intentional Hindi/Hinglish words into unrelated English ones, and do not translate anything. ' +
          'Correct the text for spelling and grammar while keeping the meaning, tone, emojis, line breaks, and WhatsApp formatting markers (*bold*, _italic_, ~strike~, ```code```) intact. ' +
          'Preserve placeholders like {{name}} and {{date}} exactly. ' +
          'Return ONLY valid JSON in this exact shape, no other text: {"correctedText": "..."}',
        message: trimmed,
        maxOutputTokens: 1200,
        temperature: 0.1,
      });

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      const correctedText = parsed?.correctedText;
      if (typeof correctedText === 'string') {
        return NextResponse.json({ success: true, correctedText }, { status: 200 });
      }
      console.error('AI response missing correctedText (ai-correct):', raw);
      return NextResponse.json({ success: true, correctedText: basicAutocorrect(text) }, { status: 200 });
    } catch (error) {
      console.error('AI call error (ai-correct):', error instanceof Error ? error.message : error);
      return NextResponse.json({ success: true, correctedText: basicAutocorrect(text) }, { status: 200 });
    }
  } catch (error) {
    console.error('AI correction error:', error);
    return NextResponse.json({ error: 'Failed to correct text' }, { status: 500 });
  }
}
