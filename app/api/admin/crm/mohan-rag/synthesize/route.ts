import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { synthesizeMohanAvatarScript, type DeliveryDuration } from '@/lib/mohanRag/multiTalkSynthesizer';
import { isMohanRagModule, type MohanRagModule } from '@/lib/mohanRag/knowledgeRepository';
import { translateWithFreeEngine } from '@/lib/freeTranslationService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function requireAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return !!decoded && isSuperAdmin(decoded, request);
  } catch {
    return false;
  }
}

/**
 * POST /api/admin/crm/mohan-rag/synthesize
 * Synthesizes multi-talk knowledge into an adaptive Avatar script
 * with SOV/SVO grammar alignment, colloquial language, and cultural context.
 */
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const topic = String(body?.topic || body?.query || '').trim();
    const targetLanguage = String(body?.targetLanguage || body?.language || 'en').trim();
    const duration: DeliveryDuration = ['reel_30s', 'lesson_3m', 'master_15m'].includes(
      body?.duration || body?.durationFormat
    )
      ? body.duration || body.durationFormat
      : 'lesson_3m';
    const moduleId: MohanRagModule | undefined = isMohanRagModule(body?.moduleId)
      ? body.moduleId
      : undefined;
    const customIntent = body?.customIntent ? String(body.customIntent).trim() : undefined;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required for script synthesis.' }, { status: 400 });
    }

    try {
      const result = await synthesizeMohanAvatarScript({
        topic,
        targetLanguage,
        duration,
        moduleId,
        customIntent,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (aiError) {
      console.warn('[Mohan RAG Synthesize AI failed, using Free Engine fallback]:', aiError);
      const sourceText = String(body?.script || body?.text || topic);
      const translatedText = await translateWithFreeEngine(sourceText, targetLanguage);
      return NextResponse.json({
        success: true,
        synthesized: {
          script: translatedText,
          language: targetLanguage,
          topic,
          duration,
        },
        script: translatedText,
        targetLanguage,
        topic,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Script synthesis failed.';
    console.error('[Mohan RAG Synthesize Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

