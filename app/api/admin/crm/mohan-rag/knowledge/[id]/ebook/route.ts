import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKnowledgeSource, listKnowledgeEbookDrafts, saveKnowledgeEbookDraft } from '@/lib/mohanRag/knowledgeRepository';
import { rewriteForReading } from '@/lib/aiVideo/transcribeAndCondense';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const admin = verifyToken(token);
    if (!admin || !isSuperAdmin(admin, request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    const drafts = await listKnowledgeEbookDrafts(params.id);
    return NextResponse.json({ success: true, drafts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load e-book drafts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const admin = verifyToken(token);
    if (!admin || !isSuperAdmin(admin, request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    const source = await getKnowledgeSource(params.id);
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    if (source.status !== 'approved') return NextResponse.json({ error: 'Approve this source before creating an e-book draft.' }, { status: 409 });
    if (source.content.length > 30_000) return NextResponse.json({ error: 'This source is too large for one e-book chapter. Split it into shorter approved source items first.' }, { status: 413 });
    const body = await request.json();
    const sourceLanguage = String(body?.sourceLanguage || '');
    const targetLanguage = String(body?.targetLanguage || '');
    if (!['en', 'hi', 'mr'].includes(sourceLanguage) || !['en', 'hi', 'mr'].includes(targetLanguage)) {
      return NextResponse.json({ error: 'Choose source and e-book languages: English, Hindi, or Marathi.' }, { status: 400 });
    }
    const content = await rewriteForReading(source.content, sourceLanguage, targetLanguage, source.title);
    if (!content.trim()) return NextResponse.json({ error: 'The e-book draft was empty. Try again.' }, { status: 502 });
    const draft = await saveKnowledgeEbookDraft({
      sourceId: source.id,
      language: targetLanguage,
      content,
      createdBy: String((admin as any).userId || (admin as any).username || 'admin'),
    });
    return NextResponse.json({ success: true, draft, sourceTitle: source.title });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create e-book draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
