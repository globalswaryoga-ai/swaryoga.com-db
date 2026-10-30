import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface AiJobRecord {
  id: string;
  project_id: string;
  job_type: 'video_training' | 'transcription' | 'voice_synthesis' | 'video_render' | 'facial_analysis';
  stage: 'audio_extraction' | 'frame_extraction' | 'transcription' | 'facial_analysis' | 'gesture_analysis' | 'performance_dna' | 'translation' | 'voice_generation' | 'lip_sync' | 'rendering' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  provider: string;
  provider_job_id?: string;
  idempotency_key?: string;
  attempt_number: number;
  heartbeat_at?: string;
  locked_until?: string;
  cost_estimate_usd: number;
  actual_cost_usd: number;
  error_log?: string;
  input_payload_json?: string;
  output_result_json?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new background AI job with idempotency protection
 */
export async function createAiJob(
  job: Partial<AiJobRecord> & { project_id: string; job_type: AiJobRecord['job_type']; stage: AiJobRecord['stage'] }
): Promise<AiJobRecord> {
  const now = new Date().toISOString();
  const id = job.id || `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const idempotencyKey = job.idempotency_key || `idem_${job.project_id}_${job.stage}_${Date.now()}`;

  await bunnyExecute({
    sql: `INSERT INTO mohan_ai_jobs_sql
          (id, project_id, job_type, stage, status, progress, provider, provider_job_id,
           idempotency_key, attempt_number, heartbeat_at, cost_estimate_usd, actual_cost_usd,
           error_log, input_payload_json, output_result_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(idempotency_key) DO UPDATE SET
            status = CASE WHEN mohan_ai_jobs_sql.status = 'failed' THEN 'pending' ELSE mohan_ai_jobs_sql.status END,
            updated_at = excluded.updated_at`,
    args: [
      id,
      job.project_id,
      job.job_type,
      job.stage,
      job.status || 'pending',
      job.progress || 0,
      job.provider || 'internal_worker',
      job.provider_job_id || null,
      idempotencyKey,
      job.attempt_number || 1,
      now,
      job.cost_estimate_usd || 0.05,
      job.actual_cost_usd || 0.0,
      job.error_log || null,
      job.input_payload_json || null,
      job.output_result_json || null,
      now,
      now,
    ],
  });

  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_ai_jobs_sql WHERE idempotency_key = ? LIMIT 1`,
    args: [idempotencyKey],
  });
  return res.rows[0] as unknown as AiJobRecord;
}

/**
 * Heartbeat an active job to prevent premature timeout
 */
export async function heartbeatJob(jobId: string, progress?: number): Promise<void> {
  const now = new Date().toISOString();
  // Extend lock for 5 minutes from now
  const lockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await bunnyExecute({
    sql: `UPDATE mohan_ai_jobs_sql
          SET heartbeat_at = ?,
              locked_until = ?,
              progress = COALESCE(?, progress),
              updated_at = ?
          WHERE id = ?`,
    args: [now, lockUntil, progress ?? null, now, jobId],
  });
}

/**
 * Mark a job as successfully completed
 */
export async function completeJob(jobId: string, outputResultJson: string, actualCostUsd = 0.0): Promise<void> {
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `UPDATE mohan_ai_jobs_sql
          SET status = 'completed',
              progress = 100,
              output_result_json = ?,
              actual_cost_usd = ?,
              locked_until = NULL,
              updated_at = ?
          WHERE id = ?`,
    args: [outputResultJson, actualCostUsd, now, jobId],
  });
}

/**
 * Mark a job as failed with retry tracking
 */
export async function failJob(jobId: string, errorLog: string): Promise<void> {
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `UPDATE mohan_ai_jobs_sql
          SET status = 'failed',
              error_log = ?,
              locked_until = NULL,
              updated_at = ?
          WHERE id = ?`,
    args: [errorLog, now, jobId],
  });
}

/**
 * Fetch all AI jobs for a project
 */
export async function getJobsForProject(projectId: string): Promise<AiJobRecord[]> {
  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_ai_jobs_sql WHERE project_id = ? ORDER BY created_at DESC`,
    args: [projectId],
  });
  return (res.rows || []) as unknown as AiJobRecord[];
}

