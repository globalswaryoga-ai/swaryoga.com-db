import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { isMohanRagModule } from '@/lib/mohanRag/knowledgeRepository';
import { generateGroundedMohanAnswer, generateOnlineAiWebAnswer, saveRagAnswer } from '@/lib/mohanRag/answerService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function requireMohanRagAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return !!decoded && isSuperAdmin(decoded, request);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!requireMohanRagAdmin(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const query = String(body?.query || '').trim();
    const moduleId = String(body?.moduleId || '');
    const language = String(body?.language || 'auto').slice(0, 20);
    const searchMode = String(body?.searchMode || 'mohan_sir').toLowerCase(); // 'mohan_sir' | 'web_ai'

    if (!query) return NextResponse.json({ error: 'Enter a question to search' }, { status: 400 });
    if (!isMohanRagModule(moduleId)) return NextResponse.json({ error: 'Select a valid knowledge module' }, { status: 400 });
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Language must be auto, English, Hindi, or Marathi' }, { status: 400 });
    if (query.length > 4000) return NextResponse.json({ error: 'Question exceeds the allowed length' }, { status: 413 });

    const answer = searchMode === 'web_ai'
      ? await generateOnlineAiWebAnswer({ query, moduleId, language })
      : await generateGroundedMohanAnswer({ query, moduleId, language });

    const userId = String((verifyToken(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '') as any)?.userId || 'admin');
    const saved = await saveRagAnswer({ moduleId, language, question: query, answer, createdBy: userId });
    return NextResponse.json({
      success: true,
      id: saved?.id,
      sufficientContext: answer.sufficientContext,
      language,
      searchMode: searchMode === 'web_ai' ? 'web_ai' : 'mohan_sir',
      answer: answer.answer,
      citations: answer.citations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mohan RAG search failed';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
