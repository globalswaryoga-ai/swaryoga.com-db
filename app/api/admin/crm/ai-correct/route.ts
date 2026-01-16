import { NextRequest, NextResponse } from 'next/server';

// Mark as dynamic since this route uses request.headers or request.url
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
    const body = await request.json().catch(() => null);
    const text = body?.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json({ success: true, correctedText: '' }, { status: 200 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, correctedText: basicAutocorrect(text) }, { status: 200 });
    }

    // Claude pass
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1200,
          messages: [
            {
              role: 'user',
              content: `You are a spelling and grammar correction assistant for WhatsApp/CRM text.\n\nCorrect the following text for English spelling and grammar while keeping the meaning, tone, emojis, line breaks, and WhatsApp formatting markers (*bold*, _italic_, ~strike~, \\\`\\\`\\\`code\\\`\\\`\\\`).\n\nImportant:\n- Do NOT add extra explanation.\n- Return ONLY valid JSON in this shape: {"correctedText": "..."}\n- Preserve placeholders like {{name}} and {{date}} exactly.\n\nText:\n---\n${trimmed}\n---`,
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error('Claude API error (ai-correct):', response.status, response.statusText);
        return NextResponse.json({ success: true, correctedText: basicAutocorrect(text) }, { status: 200 });
      }

      const data = await response.json().catch(() => null);
      const content = data?.content?.[0]?.text || '';

      try {
        const parsed = JSON.parse(content);
        const correctedText = parsed?.correctedText;
        if (typeof correctedText === 'string') {
          return NextResponse.json({ success: true, correctedText }, { status: 200 });
        }
      } catch {
        console.error('Failed to parse Claude response (ai-correct):', content);
      }

      return NextResponse.json({ success: true, correctedText: basicAutocorrect(text) }, { status: 200 });
    } catch (error) {
      console.error('Claude API call error (ai-correct):', error);
      return NextResponse.json({ success: true, correctedText: basicAutocorrect(text) }, { status: 200 });
    }
  } catch (error) {
    console.error('AI correction error:', error);
    return NextResponse.json({ error: 'Failed to correct text' }, { status: 500 });
  }
}
