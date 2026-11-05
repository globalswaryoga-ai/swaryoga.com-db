import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKnowledgeSource, saveKnowledgeSource, listKnowledgeSources } from '@/lib/mohanRag/knowledgeRepository';
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

// GET: Scan all library sources for language consistency, mixed speech, or Whisper acoustic corruption
export async function GET(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const sources = await listKnowledgeSources();
    const results = sources.map(s => {
      const detection = detectTextLanguage(s.content || '');
      const isAlreadyStandardized = s.extractionType === 'language_separated_proofread';
      const hasWhisperAcousticGarble = /गले बंद|सवकाज|सेक्सी रेलेटेड|श्वस्णाच|मानोसा|शेतल्जी|कामक्रोत|आहंकार मनाते|मद मनजे/.test(s.content || '');
      const isMismatch = (s.language === 'mr' && detection.detectedLanguage === 'hi') ||
                         (s.language === 'hi' && detection.detectedLanguage === 'mr');
      
      const needsCleanup = !isAlreadyStandardized && (detection.isMixed || isMismatch || hasWhisperAcousticGarble);

      return {
        id: s.id,
        title: s.title,
        taggedLanguage: s.language,
        detectedLanguage: detection.detectedLanguage,
        confidence: detection.confidence,
        isMixed: detection.isMixed,
        isMismatch,
        hasWhisperAcousticGarble,
        isAlreadyStandardized,
        needsCleanup,
        explanation: detection.explanation,
        contentLength: (s.content || '').length,
      };
    });

    const needsCleanupCount = results.filter(r => r.needsCleanup).length;
    const cleanCount = results.length - needsCleanupCount;

    return NextResponse.json({
      success: true,
      totalSources: results.length,
      cleanCount,
      needsCleanupCount,
      sources: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const action = String(body?.action || 'standardize'); // 'detect' | 'reassign' | 'standardize' | 'batch_standardize'

    // Batch standardization for all or specified sources
    if (action === 'batch_standardize') {
      const sourceIds: string[] = Array.isArray(body?.sourceIds) ? body.sourceIds : [];
      const sourcesToClean = sourceIds.length > 0 
        ? await Promise.all(sourceIds.map(id => getKnowledgeSource(id)))
        : await listKnowledgeSources();

      const validSources = sourcesToClean.filter((s): s is NonNullable<typeof s> => !!s && !!s.content);
      const cleanedResults: Array<{ id: string; title: string; language: string; success: boolean }> = [];

      for (const source of validSources) {
        try {
          const detection = detectTextLanguage(source.content);
          // Target language defaults to tagged language, or detected if auto
          const targetLang: 'hi' | 'mr' | 'en' = source.language === 'hi' || source.language === 'mr' || source.language === 'en'
            ? (source.language as 'hi' | 'mr' | 'en')
            : (detection.detectedLanguage === 'hi' ? 'hi' : 'mr');

          const res = await separateAndStandardizeLanguage(source.content, targetLang);
          await saveKnowledgeSource({
            ...source,
            content: res.cleanedText,
            language: targetLang,
            extractionType: 'language_separated_proofread',
          }, admin.userId || 'admin', source);

          cleanedResults.push({ id: source.id, title: source.title, language: targetLang, success: true });
        } catch (err) {
          cleanedResults.push({ id: source.id, title: source.title, language: source.language, success: false });
        }
      }

      return NextResponse.json({
        success: true,
        processedCount: cleanedResults.length,
        results: cleanedResults,
        message: `Successfully processed ${cleanedResults.filter(r => r.success).length} sources into pure spoken text.`,
      });
    }

    const sourceId = typeof body?.sourceId === 'string' ? body.sourceId.trim() : '';
    const targetLanguage = String(body?.targetLanguage || 'auto').toLowerCase();

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

