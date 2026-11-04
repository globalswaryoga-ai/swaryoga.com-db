import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKnowledgeSource, saveKnowledgeSource } from '@/lib/mohanRag/knowledgeRepository';
import { detectTextLanguage, separateAndStandardizeLanguage } from '@/lib/mohanRag/languageFilterEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

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
    const targetLanguage = String(body?.targetLanguage || 'auto').toLowerCase();
    const action = String(body?.action || 'standardize'); // 'detect' | 'reassign' | 'standardize'

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
    }

    const source = await getKnowledgeSource(sourceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // 1. Detection
    const detection = detectTextLanguage(source.content);

    if (action === 'detect') {
      return NextResponse.json({ success: true, detection });
    }

    // 2. Simple language reassignment without rewriting text
    if (action === 'reassign') {
      const newLang = ['hi', 'mr', 'en', 'sa'].includes(targetLanguage) ? targetLanguage : detection.detectedLanguage;
      const updated = await saveKnowledgeSource({
        id: source.id,
        moduleId: source.moduleId,
        title: source.title,
        content: source.content,
        topic: source.topic,
        language: newLang,
        sourceType: source.sourceType,
        sourceReference: source.sourceReference,
        originalFileName: source.originalFileName,
        originalFileUrl: source.originalFileUrl,
        originalMimeType: source.originalMimeType,
        extractionType: source.extractionType,
      }, admin.userId || 'admin', source);

      return NextResponse.json({
        success: true,
        source: updated,
        message: `Language successfully updated to ${newLang.toUpperCase()}`,
      });
    }

    // 3. Full standardization and clean language separation
    const resolvedTarget: 'hi' | 'mr' | 'en' = targetLanguage === 'hi' || targetLanguage === 'mr' || targetLanguage === 'en'
      ? targetLanguage
      : (detection.detectedLanguage === 'hi' ? 'hi' : 'mr');

    const result = await separateAndStandardizeLanguage(source.content, resolvedTarget);

    const updated = await saveKnowledgeSource({
      id: source.id,
      moduleId: source.moduleId,
      title: source.title,
      content: result.cleanedText,
      topic: source.topic,
      language: resolvedTarget,
      sourceType: source.sourceType,
      sourceReference: source.sourceReference,
      originalFileName: source.originalFileName,
      originalFileUrl: source.originalFileUrl,
      originalMimeType: source.originalMimeType,
      extractionType: 'language_separated_proofread',
    }, admin.userId || 'admin', source);

    return NextResponse.json({
      success: true,
      source: updated,
      detectedOriginal: result.originalLanguageDetected,
      cleanedText: result.cleanedText,
      message: `Transcript cleaned and standardized to pure ${resolvedTarget.toUpperCase()}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Language separation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

