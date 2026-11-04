import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  ensureBlueprintSchema,
  executeStep2LanguageCheck,
  executeStep3SpellCheck,
  executeStep4GrammarFamilyCheck,
  executeStep5GrammarCheck,
  executeStep6CreateBlueprints,
  runComplete6StepPipeline,
  updateBlueprintAdminCorrections,
} from '@/lib/mohanRag/sixStepBlueprintPipeline';

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

export async function GET(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    await ensureBlueprintSchema();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const topic = searchParams.get('topic');

    if (id) {
      const res = await bunnyExecute({
        sql: 'SELECT * FROM mohan_rag_topic_blueprints_sql WHERE id = ? LIMIT 1',
        args: [id],
      });
      return NextResponse.json({ success: true, blueprint: res.rows[0] || null });
    }

    if (topic) {
      const res = await bunnyExecute({
        sql: 'SELECT * FROM mohan_rag_topic_blueprints_sql WHERE topic = ? ORDER BY updated_at DESC LIMIT 1',
        args: [topic],
      });
      return NextResponse.json({ success: true, blueprint: res.rows[0] || null });
    }

    const res = await bunnyExecute(
      'SELECT id, topic, module_id, step2_detected_language, step4_grammar_family, status, updated_at FROM mohan_rag_topic_blueprints_sql ORDER BY updated_at DESC LIMIT 100'
    );
    return NextResponse.json({ success: true, blueprints: res.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch blueprints';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const action = String(body?.action || 'run_all'); // 'run_all' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6'
    const rawText = String(body?.rawText || '').trim();
    const topic = String(body?.topic || 'Untitled Swar Yoga Topic').trim();
    const moduleId = String(body?.moduleId || 'level-1').trim();
    const sourceId = String(body?.sourceId || '').trim();
    const language = String(body?.language || 'auto').trim();

    if (!rawText && action !== 'step6') {
      return NextResponse.json({ error: 'rawText is required to run the pipeline' }, { status: 400 });
    }

    // Step 2 only
    if (action === 'step2') {
      const detection = executeStep2LanguageCheck(rawText);
      return NextResponse.json({ success: true, step: 2, detection });
    }

    // Step 3 only: Spell check
    if (action === 'step3') {
      const detected = language === 'auto' ? executeStep2LanguageCheck(rawText).detectedLanguage : language;
      const spellchecked = await executeStep3SpellCheck(rawText, detected);
      return NextResponse.json({ success: true, step: 3, detectedLanguage: detected, spellchecked });
    }

    // Step 4 & 5: Grammar Engine check
    if (action === 'step5') {
      const detected = language === 'auto' ? executeStep2LanguageCheck(rawText).detectedLanguage : language;
      const grammarFamily = executeStep4GrammarFamilyCheck(detected);
      const grammarApproved = await executeStep5GrammarCheck(rawText, detected);
      return NextResponse.json({ success: true, step: 5, grammarFamily, grammarApproved });
    }

    // Step 6 only: Create Master Blueprints
    if (action === 'step6') {
      const grammarApprovedText = String(body?.grammarApprovedText || rawText);
      const blueprints = await executeStep6CreateBlueprints(grammarApprovedText, language, topic);
      return NextResponse.json({ success: true, step: 6, blueprints });
    }

    // Default: Run complete 6-Step Pipeline automatically
    const blueprint = await runComplete6StepPipeline({
      rawText,
      topic,
      moduleId,
      sourceId,
      preferredLanguage: language,
    });

    return NextResponse.json({
      success: true,
      message: 'Complete 6-step blueprint pipeline generated successfully',
      blueprint,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Blueprint id is required' }, { status: 400 });

    await updateBlueprintAdminCorrections(id, {
      step3SpellcheckedText: body?.step3SpellcheckedText,
      step5GrammarApprovedText: body?.step5GrammarApprovedText,
      step6SovPlain: body?.step6SovPlain,
      step6SovHummer: body?.step6SovHummer,
      step6SvoPlain: body?.step6SvoPlain,
      step6SvoHummer: body?.step6SvoHummer,
      status: body?.status,
      adminNotes: body?.adminNotes,
    });

    return NextResponse.json({ success: true, message: 'Admin corrections saved successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save admin corrections';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

