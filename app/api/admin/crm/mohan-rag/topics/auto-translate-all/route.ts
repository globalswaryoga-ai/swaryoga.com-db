import { NextRequest, NextResponse } from 'next/server';
import { requireMohanRagAdmin } from '@/lib/mohanRag/auth';
import { synthesizeTopicAcrossLanguages, SUPPORTED_27_LANGUAGES } from '@/lib/mohanRag/multiLanguageSynthesisEngine';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body?.action || 'synthesize_topic';
    const topic = String(body?.topic || '').trim();
    const moduleId = String(body?.moduleId || 'level1').trim();
    const targetLanguages = Array.isArray(body?.targetLanguages) && body.targetLanguages.length > 0
      ? body.targetLanguages
      : ['en', 'hi', 'mr', 'es', 'de', 'fr', 'ja'];

    if (action === 'synthesize_topic') {
      if (!topic) {
        return NextResponse.json({ error: 'topic is required' }, { status: 400 });
      }

      const result = await synthesizeTopicAcrossLanguages({
        topic,
        moduleId,
        targetLanguages,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully synthesized "${topic}" into ${result.generatedLanguages.length} languages!`,
        result,
      });
    }

    if (action === 'synthesize_all_in_module') {
      // Find all distinct topics in module
      const topicsRes = await bunnyExecute({
        sql: `SELECT DISTINCT topic FROM mohan_rag_sources_sql WHERE module_id = ? AND topic != ''`,
        args: [moduleId],
      });

      const distinctTopics = (topicsRes.rows || []).map((r: any) => r.topic);
      const results: any[] = [];

      for (const t of distinctTopics.slice(0, 10)) { // Batch process top 10
        try {
          const res = await synthesizeTopicAcrossLanguages({
            topic: t,
            moduleId,
            targetLanguages,
          });
          results.push({ topic: t, success: true, count: res.generatedLanguages.length });
        } catch (err: any) {
          results.push({ topic: t, success: false, error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Processed ${results.length} topics in ${moduleId}`,
        results,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in multi-language synthesis route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to synthesize topic across languages' },
      { status: 500 }
    );
  }
}
