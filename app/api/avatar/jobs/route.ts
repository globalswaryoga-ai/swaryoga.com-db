import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initMohanCloneSchema, type AiJobRecord } from '@/lib/mohanAiClone/mohanAiCloneRepository';

export const dynamic = 'force-dynamic';

const PIPELINE_STAGES = [
  'audio_extraction',
  'frame_extraction',
  'transcription',
  'facial_analysis',
  'gesture_analysis',
  'performance_dna',
  'translation',
  'voice_generation',
  'lip_sync',
  'rendering',
  'export',
] as const;

export async function GET(request: NextRequest) {
  try {
    await initMohanCloneSchema();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const jobId = searchParams.get('id');

    if (jobId) {
      const res = await bunnyExecute({
        sql: `SELECT * FROM mohan_ai_jobs_sql WHERE id = ? LIMIT 1`,
        args: [jobId],
      });
      if (!res.rows || res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    const sql = projectId
      ? `SELECT * FROM mohan_ai_jobs_sql WHERE project_id = ? ORDER BY created_at ASC`
      : `SELECT * FROM mohan_ai_jobs_sql ORDER BY created_at DESC LIMIT 50`;
    const res = await bunnyExecute(projectId ? { sql, args: [projectId] } : sql);

    return NextResponse.json({ success: true, data: res.rows || [] });
  } catch (err: any) {
    console.error('Failed to get AI jobs:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initMohanCloneSchema();
    const body = await request.json();
    const { action, projectId, jobId, stage, assetId, providerName } = body;
    const now = new Date().toISOString();

    // ── ACTION 1: START PIPELINE FOR 30M+ VIDEO ──
    if (action === 'start') {
      const pId = projectId || `proj_${Date.now()}`;
      const firstStage = stage || PIPELINE_STAGES[0];
      const newJobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      await bunnyExecute({
        sql: `INSERT INTO mohan_ai_jobs_sql
              (id, project_id, asset_id, stage, status, progress_pct, provider_name, retry_count, max_retries, processing_cost_usd, started_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'processing', 5, ?, 0, 3, 0.05, ?, ?, ?)`,
        args: [newJobId, pId, assetId || null, firstStage, providerName || 'Gemini 2.5 + Faster-Whisper', now, now, now],
      });

      return NextResponse.json({
        success: true,
        jobId: newJobId,
        projectId: pId,
        stage: firstStage,
        status: 'processing',
        pipeline: PIPELINE_STAGES,
        message: 'Background job initialized successfully. Pipeline stage 1/11 running.',
      });
    }

    // ── ACTION 2: RESUME FROM LAST SUCCESSFUL STAGE ──
    if (action === 'resume') {
      if (!projectId && !jobId) {
        return NextResponse.json({ success: false, error: 'projectId or jobId required to resume' }, { status: 400 });
      }

      const jobsRes = await bunnyExecute({
        sql: `SELECT * FROM mohan_ai_jobs_sql WHERE project_id = ? ORDER BY created_at DESC`,
        args: [projectId],
      });

      const existingJobs = (jobsRes.rows || []) as unknown as AiJobRecord[];
      const completedStages = new Set(existingJobs.filter(j => j.status === 'completed').map(j => j.stage));
      
      // Find the first uncompleted stage
      const nextStage = PIPELINE_STAGES.find(s => !completedStages.has(s)) || 'completed';

      if (nextStage === 'completed') {
        return NextResponse.json({
          success: true,
          status: 'all_stages_completed',
          message: 'All 11 pipeline stages are already completed for this project.',
        });
      }

      const resumedJobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      await bunnyExecute({
        sql: `INSERT INTO mohan_ai_jobs_sql
              (id, project_id, asset_id, stage, status, progress_pct, provider_name, retry_count, max_retries, processing_cost_usd, started_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'processing', 10, ?, 0, 3, 0.02, ?, ?, ?)`,
        args: [resumedJobId, projectId, assetId || null, nextStage, providerName || 'Gemini 2.5 Adapter', now, now, now],
      });

      return NextResponse.json({
        success: true,
        jobId: resumedJobId,
        resumedStage: nextStage,
        completedStages: Array.from(completedStages),
        message: `Pipeline successfully resumed from stage '${nextStage}'. Previous stages preserved.`,
      });
    }

    // ── ACTION 3: RETRY FAILED STAGE ──
    if (action === 'retry') {
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'jobId required for retry' }, { status: 400 });
      }

      await bunnyExecute({
        sql: `UPDATE mohan_ai_jobs_sql
              SET status = 'processing',
                  retry_count = retry_count + 1,
                  progress_pct = 10,
                  error_log = NULL,
                  updated_at = ?
              WHERE id = ?`,
        args: [now, jobId],
      });

      return NextResponse.json({
        success: true,
        jobId,
        message: 'Stage retried. Status set back to processing.',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Failed to process AI job action:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

