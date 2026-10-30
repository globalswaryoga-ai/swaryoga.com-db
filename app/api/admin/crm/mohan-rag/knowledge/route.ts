import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  isMohanRagModule,
  listKnowledgeSources,
  saveKnowledgeSource,
  type KnowledgeStatus,
} from '@/lib/mohanRag/knowledgeRepository';

export const dynamic = 'force-dynamic';

function requireMohanRagAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  const url = new URL(request.url);
  const moduleId = url.searchParams.get('module');
  const status = url.searchParams.get('status');
  if (moduleId && !isMohanRagModule(moduleId)) return NextResponse.json({ error: 'Unknown knowledge module' }, { status: 400 });
  if (status && !['draft', 'approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid source status' }, { status: 400 });

  try {
    const sources = await listKnowledgeSources(moduleId ? moduleId : undefined, status as KnowledgeStatus | undefined);
    return NextResponse.json({ success: true, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list Mohan RAG sources';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const moduleId = String(body?.moduleId || '');
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    const sourceReference = String(body?.sourceReference || '').trim();
    const language = String(body?.language || 'auto');
    if (!isMohanRagModule(moduleId)) return NextResponse.json({ error: 'Select a valid knowledge module' }, { status: 400 });
    if (!title || !content) return NextResponse.json({ error: 'Title and source text are required' }, { status: 400 });
    if (moduleId === 'research' && !sourceReference) return NextResponse.json({ error: 'A source citation or URL is required for research reports' }, { status: 400 });
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Language must be auto, English, Hindi, or Marathi' }, { status: 400 });
    if (title.length > 300 || content.length > 180_000) return NextResponse.json({ error: 'Title or source text exceeds the current text-editor limit (180,000 characters)' }, { status: 413 });

    const userId = String((admin as any).userId || (admin as any).username || 'admin');
    const source = await saveKnowledgeSource({
      moduleId,
      title,
      content,
      topic: String(body.topic || '').slice(0, 300),
      language,
      sourceType: 'text',
      sourceReference: sourceReference.slice(0, 1000),
    }, userId);
    return NextResponse.json({ success: true, source }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save source';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
