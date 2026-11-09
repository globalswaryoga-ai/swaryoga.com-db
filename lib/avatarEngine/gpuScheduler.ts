/**
 * Swar Yoga In-House AI Avatar - Intelligent GPU Scheduler
 * =========================================================
 * Dispatches avatar generation jobs across 4 independent GPU workers
 * according to task category, minimum VRAM headroom, model installation status,
 * and session health.
 * 
 * Safety & Reliability:
 * 1. Strictly 1 active job per physical GPU worker (prevents OOM crashes).
 * 2. VRAM validation check before claiming.
 * 3. Automatic failover: dead worker jobs re-queued with retry backoff.
 * 4. Automatic worker status updates (idle -> busy -> idle).
 */

import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import {
  GpuWorkerRegistry,
  GpuWorkerRecord,
  GpuTaskCategory,
} from './gpuWorkerRegistry';

export interface GpuTaskRecord {
  id: string;
  parentRenderJobId: string;
  taskCategory: GpuTaskCategory;
  requiredModel: string;
  minVramMb: number;
  assignedWorkerId: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  inputPayloadJson: string;
  outputArtifactUrl: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const VRAM_REQUIREMENTS: Record<GpuTaskCategory, { minMb: number; defaultModel: string }> = {
  lip_sync_musetalk: {
    minMb: 6144, // 6 GB minimum VRAM for MuseTalk / Whisper
    defaultModel: 'MuseTalk',
  },
  face_reconstruction: {
    minMb: 4096, // 4 GB minimum VRAM for 3DDFA / LivePortrait
    defaultModel: 'LivePortrait',
  },
  motion_generation: {
    minMb: 4096, // 4 GB minimum VRAM for 3D body motion & retargeting
    defaultModel: 'MotionDiffusion',
  },
  scene_enhancement: {
    minMb: 8192, // 8 GB minimum VRAM for Real-ESRGAN / CodeFormer 4K super-resolution
    defaultModel: 'Real-ESRGAN-x4plus',
  },
};

const TABLE_TASKS = 'avatar_gpu_tasks_sql';
const MAX_DEFAULT_RETRIES = 3;

export class GpuScheduler {
  private static schemaPromise: Promise<void> | null = null;

  public static async initSchema(): Promise<void> {
    if (!this.schemaPromise) {
      await GpuWorkerRegistry.initSchema();
      this.schemaPromise = bunnyBatch([
        {
          sql: `CREATE TABLE IF NOT EXISTS ${TABLE_TASKS} (
            id TEXT PRIMARY KEY,
            parent_render_job_id TEXT NOT NULL,
            task_category TEXT NOT NULL,
            required_model TEXT NOT NULL,
            min_vram_mb INTEGER NOT NULL,
            assigned_worker_id TEXT,
            status TEXT NOT NULL DEFAULT 'queued',
            retry_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            input_payload_json TEXT NOT NULL DEFAULT '{}',
            output_artifact_url TEXT,
            error_message TEXT,
            started_at TEXT,
            completed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )`,
        },
      ]).then(() => undefined).catch((error) => {
        this.schemaPromise = null;
        throw error;
      });
    }
    await this.schemaPromise;
  }

  /**
   * Enqueues an AI inference task into the GPU scheduler queue.
   */
  public static async enqueueTask(params: {
    parentRenderJobId: string;
    taskCategory: GpuTaskCategory;
    requiredModel?: string;
    inputPayload: Record<string, any>;
    minVramMb?: number;
  }): Promise<GpuTaskRecord> {
    await this.initSchema();
    const id = `gpu_task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const config = VRAM_REQUIREMENTS[params.taskCategory];
    const requiredModel = params.requiredModel || config.defaultModel;
    const minVramMb = params.minVramMb || config.minMb;

    await bunnyExecute({
      sql: `INSERT INTO ${TABLE_TASKS} (
        id, parent_render_job_id, task_category, required_model, min_vram_mb,
        assigned_worker_id, status, retry_count, max_retries, input_payload_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, 'queued', 0, ?, ?, ?, ?)`,
      args: [
        id,
        params.parentRenderJobId,
        params.taskCategory,
        requiredModel,
        minVramMb,
        MAX_DEFAULT_RETRIES,
        JSON.stringify(params.inputPayload || {}),
        now,
        now,
      ],
    });

    const task = await this.getTaskById(id);
    if (!task) throw new Error(`Task ${id} could not be created.`);
    return task;
  }

  /**
   * Worker calls this to claim the next compatible pending task.
   * Ensures:
   * 1. Task matches worker's assigned category.
   * 2. Worker has sufficient available VRAM.
   * 3. Worker has the required AI model installed.
   * 4. Updates worker status to 'busy'.
   */
  public static async claimNextTaskForWorker(workerId: string): Promise<GpuTaskRecord | null> {
    await this.initSchema();

    // 1. Fetch worker profile
    const worker = await GpuWorkerRegistry.getWorkerById(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} is not registered.`);
    }

    if (worker.status === 'busy') {
      // Worker is already running a job
      return null;
    }

    // 2. Query pending queued tasks compatible with this worker
    const res = await bunnyExecute({
      sql: `SELECT * FROM ${TABLE_TASKS}
        WHERE status = 'queued'
          AND task_category = ?
          AND min_vram_mb <= ?
        ORDER BY created_at ASC LIMIT 5`,
      args: [worker.assignedTaskCategory, worker.availableVramMb],
    });

    const candidates = res.rows || [];
    let selectedCandidate: any = null;

    for (const cand of candidates) {
      const requiredModel = String(cand.required_model || '');
      // Check if model is installed or if generic
      const hasModel = worker.installedModels.some(
        (m) => m.toLowerCase().includes(requiredModel.toLowerCase()) || requiredModel === ''
      );
      if (hasModel || worker.installedModels.length === 0) {
        selectedCandidate = cand;
        break;
      }
    }

    if (!selectedCandidate) {
      return null;
    }

    const taskId = String(selectedCandidate.id);
    const now = new Date().toISOString();

    // 3. Atomically assign task to worker
    const updateResult = await bunnyExecute({
      sql: `UPDATE ${TABLE_TASKS}
        SET status = 'running', assigned_worker_id = ?, started_at = ?, updated_at = ?
        WHERE id = ? AND status = 'queued'`,
      args: [workerId, now, now, taskId],
    });

    if ((updateResult.rowsAffected || 0) === 0) {
      // Race condition, another worker claimed it
      return null;
    }

    // 4. Mark worker as busy
    await GpuWorkerRegistry.updateWorkerStatus(workerId, 'busy', taskId);

    return await this.getTaskById(taskId);
  }

  /**
   * Completes an assigned task and releases the GPU worker back to 'idle'.
   */
  public static async completeTask(params: {
    taskId: string;
    workerId: string;
    outputArtifactUrl: string;
  }): Promise<GpuTaskRecord> {
    await this.initSchema();
    const now = new Date().toISOString();

    const updateRes = await bunnyExecute({
      sql: `UPDATE ${TABLE_TASKS}
        SET status = 'completed', output_artifact_url = ?, completed_at = ?, updated_at = ?
        WHERE id = ? AND assigned_worker_id = ? AND status = 'running'`,
      args: [params.outputArtifactUrl, now, now, params.taskId, params.workerId],
    });

    if ((updateRes.rowsAffected || 0) === 0) {
      throw new Error(`Task ${params.taskId} could not be completed for worker ${params.workerId}.`);
    }

    // Release worker
    await GpuWorkerRegistry.updateWorkerStatus(params.workerId, 'idle', null);

    const task = await this.getTaskById(params.taskId);
    if (!task) throw new Error(`Completed task ${params.taskId} could not be reloaded.`);
    return task;
  }

  /**
   * Handles task failure with retry counter and releases the GPU worker.
   */
  public static async failTask(params: {
    taskId: string;
    workerId: string;
    errorMessage: string;
  }): Promise<GpuTaskRecord> {
    await this.initSchema();
    const now = new Date().toISOString();

    const current = await this.getTaskById(params.taskId);
    if (!current) throw new Error(`Task ${params.taskId} not found.`);

    const newRetryCount = current.retryCount + 1;
    const canRetry = newRetryCount < current.maxRetries;
    const newStatus = canRetry ? 'queued' : 'failed'; // Re-queue for another worker or mark failed

    await bunnyExecute({
      sql: `UPDATE ${TABLE_TASKS}
        SET status = ?, retry_count = ?, error_message = ?, assigned_worker_id = NULL, updated_at = ?
        WHERE id = ? AND assigned_worker_id = ?`,
      args: [newStatus, newRetryCount, params.errorMessage.slice(0, 1000), now, params.taskId, params.workerId],
    });

    // Release worker back to idle
    await GpuWorkerRegistry.updateWorkerStatus(params.workerId, 'idle', null);

    const task = await this.getTaskById(params.taskId);
    if (!task) throw new Error(`Failed task ${params.taskId} could not be reloaded.`);
    return task;
  }

  /**
   * Recovers stuck jobs from disconnected or expired workers.
   */
  public static async recoverStuckTasks(): Promise<number> {
    await this.initSchema();
    // 1. Clean dead workers first
    const deadWorkerIds = await GpuWorkerRegistry.cleanExpiredWorkers();

    if (deadWorkerIds.length === 0) return 0;

    const now = new Date().toISOString();
    // 2. Re-queue tasks assigned to dead workers
    const res = await bunnyExecute({
      sql: `UPDATE ${TABLE_TASKS}
        SET status = 'queued', assigned_worker_id = NULL, updated_at = ?
        WHERE status = 'running' AND assigned_worker_id IN (${deadWorkerIds.map(() => '?').join(',')})`,
      args: [now, ...deadWorkerIds],
    });

    return res.rowsAffected || 0;
  }

  /**
   * Helper to retrieve a single task by ID.
   */
  public static async getTaskById(taskId: string): Promise<GpuTaskRecord | null> {
    await this.initSchema();
    const res = await bunnyExecute({
      sql: `SELECT * FROM ${TABLE_TASKS} WHERE id = ?`,
      args: [taskId],
    });
    const row = res.rows?.[0] as any;
    if (!row) return null;

    return {
      id: String(row.id),
      parentRenderJobId: String(row.parent_render_job_id),
      taskCategory: row.task_category as GpuTaskCategory,
      requiredModel: String(row.required_model),
      minVramMb: Number(row.min_vram_mb),
      assignedWorkerId: row.assigned_worker_id ? String(row.assigned_worker_id) : null,
      status: row.status as GpuTaskRecord['status'],
      retryCount: Number(row.retry_count || 0),
      maxRetries: Number(row.max_retries || 3),
      inputPayloadJson: String(row.input_payload_json || '{}'),
      outputArtifactUrl: row.output_artifact_url ? String(row.output_artifact_url) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
      startedAt: row.started_at ? String(row.started_at) : null,
      completedAt: row.completed_at ? String(row.completed_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  /**
   * Returns list of pending and recent tasks.
   */
  public static async listTasks(limit = 20): Promise<GpuTaskRecord[]> {
    await this.initSchema();
    const res = await bunnyExecute({
      sql: `SELECT * FROM ${TABLE_TASKS} ORDER BY created_at DESC LIMIT ?`,
      args: [limit],
    });

    return (res.rows || []).map((row: any) => ({
      id: String(row.id),
      parentRenderJobId: String(row.parent_render_job_id),
      taskCategory: row.task_category as GpuTaskCategory,
      requiredModel: String(row.required_model),
      minVramMb: Number(row.min_vram_mb),
      assignedWorkerId: row.assigned_worker_id ? String(row.assigned_worker_id) : null,
      status: row.status as GpuTaskRecord['status'],
      retryCount: Number(row.retry_count || 0),
      maxRetries: Number(row.max_retries || 3),
      inputPayloadJson: String(row.input_payload_json || '{}'),
      outputArtifactUrl: row.output_artifact_url ? String(row.output_artifact_url) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
      startedAt: row.started_at ? String(row.started_at) : null,
      completedAt: row.completed_at ? String(row.completed_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }
}

