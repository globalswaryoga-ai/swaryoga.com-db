import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKnowledgeSource, saveKnowledgeSource } from '@/lib/mohanRag/knowledgeRepository';
import { annotateYogicAvatarCues } from '@/lib/mohanRag/avatarCueAnnotator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function requireMohanRagAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const sourceId = typeof body?.sourceId === 'string' ? body.sourceId.trim() : '';

    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }

    const source = await getKnowledgeSource(sourceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const currentContent = source.content || '';
    const annotated = annotateYogicAvatarCues(currentContent);

    const updatedSource = await saveKnowledgeSource({
      ...source,
      content: annotated,
      extractionType: 'timestamped_transcription_with_avatar_suggestions',
    }, (admin as any).userId || 'admin', source);

    return NextResponse.json({
      success: true,
      source: updatedSource,
      message: '✓ Successfully added Mohan Sir Avatar facial and emotion cues to this transcript.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to annotate cues';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
