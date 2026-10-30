import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  deleteKnowledgeSource,
  getKnowledgeSource,
  isMohanRagModule,
  saveKnowledgeSource,
  setKnowledgeSourceStatus,
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

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const source = await getKnowledgeSource(params.id);
    if (!source) return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    return NextResponse.json({ success: true, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load source';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    if (['approved', 'rejected'].includes(body?.status)) {
      const reviewerId = String((admin as any).userId || (admin as any).username || 'admin');
      if (body.status === 'approved') {
        const candidate = await getKnowledgeSource(params.id);
        if (candidate?.moduleId === 'research' && !candidate.sourceReference.trim()) {
          return NextResponse.json({ error: 'Add a source citation or URL before approving a research report' }, { status: 400 });
        }
      }
      const source = await setKnowledgeSourceStatus(params.id, body.status as KnowledgeStatus, reviewerId);
      if (!source) return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
      return NextResponse.json({ success: true, source });
    }

    const existing = await getKnowledgeSource(params.id);
    if (!existing) return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    const moduleId = String(body?.moduleId || existing.moduleId);
    const language = String(body?.language === undefined ? existing.language : body.language);
    const title = String(body?.title === undefined ? existing.title : body.title).trim();
    const content = String(body?.content === undefined ? existing.content : body.content).trim();
    const sourceReference = String(body?.sourceReference === undefined ? existing.sourceReference : body.sourceReference).trim();
    if (!isMohanRagModule(moduleId)) return NextResponse.json({ error: 'Select a valid knowledge module' }, { status: 400 });
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Language must be auto, English, Hindi, or Marathi' }, { status: 400 });
    if (!title || !content) return NextResponse.json({ error: 'Title and source text are required' }, { status: 400 });
    if (moduleId === 'research' && !sourceReference) return NextResponse.json({ error: 'A source citation or URL is required for research reports' }, { status: 400 });
    if (title.length > 300 || content.length > 180_000) return NextResponse.json({ error: 'Title or source text exceeds the current text-editor limit (180,000 characters)' }, { status: 413 });
    const source = await saveKnowledgeSource({
      id: existing.id,
      moduleId,
      title,
      content,
      topic: body.topic === undefined ? existing.topic : String(body.topic).slice(0, 300),
      language,
      sourceReference: sourceReference.slice(0, 1000),
      sourceType: existing.sourceType,
    }, existing.createdBy);
    return NextResponse.json({ success: true, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update source';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const source = await getKnowledgeSource(params.id);
    if (!source) return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    await deleteKnowledgeSource(params.id);
    return NextResponse.json({ success: true, deletedId: params.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete source';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
