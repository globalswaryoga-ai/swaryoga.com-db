import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';

function requireAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const { text, language = 'mr' } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const systemPrompt = `You are the Swar Yoga AI Emotion & Hummer Text Extraction Engine.
Your job is to annotate teacher Mohan Kalburgi's authentic lecture script with natural voice delivery emotions, expressions, and humour tags for AI Avatar training.

IMPORTANT RULES:
1. Preserve 100% of the original spoken text verbatim. DO NOT remove, rewrite, summarize, or alter any words.
2. Add genuine delivery and emotion tags before sentences or key teaching moments.
3. Allowed Emotion & Voice Tags:
   - Voice Emotions: [CALM], [EXPLAINING], [EMPHASIS], [PAUSE: 2 SECONDS], [MOTIVATIONAL], [INSPIRATIONAL], [COMPASSIONATE], [SERIOUS]
   - Speaking Expressions: [SMILING], [QUESTIONING], [TEACHING_TONE], [STORYTELLING]
   - Humour & Natural Interaction: [HUMOROUS], [LAUGHING], [LIGHT_HEARTED]
4. Do NOT invent emotions that are not present. Keep neutral statements unadorned or [CALM].
5. Never translate or change the language (preserve Marathi, Hindi, or English as given).
6. Return ONLY the annotated transcript, without any markdown code fences or conversational preamble.`;

    const annotated = await generateAIText({
      systemPrompt,
      message: `Annotate this Swar Yoga lecture transcript with authentic voice delivery, humour, and emotion tags for avatar training:\n\n${text.slice(0, 8000)}`,
      maxOutputTokens: 8192,
      temperature: 0.2,
      providerOrder: ['OpenAI', 'Anthropic', 'Groq'],
    });

    const cleanAnnotated = annotated.replace(/^```(?:text)?\s*|\s*```$/g, '').trim();

    return NextResponse.json({
      success: true,
      hummerText: cleanAnnotated || text,
    });
  } catch (error: any) {
    console.error('[Mohan RAG Hummer Engine] Error:', error);
    return NextResponse.json({ error: error.message || 'Hummer text generation failed' }, { status: 500 });
  }
}

