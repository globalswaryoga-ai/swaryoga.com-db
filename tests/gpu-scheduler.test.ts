const mockWorkers = new Map<string, Record<string, unknown>>();
const mockTasks = new Map<string, Record<string, unknown>>();

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { GpuWorkerRegistry } from '@/lib/avatarEngine/gpuWorkerRegistry';
import { GpuScheduler, VRAM_REQUIREMENTS } from '@/lib/avatarEngine/gpuScheduler';

function fakeExecute(statement: { sql: string; args?: unknown[] } | string) {
  const sql = typeof statement === 'string' ? statement : statement.sql;
  const args = typeof statement === 'string' ? [] : statement.args || [];

  if (sql.includes('PRAGMA table_info')) {
    return { rows: [{ name: 'account_email' }], rowsAffected: 0 };
  }

  // Workers
  if (sql.includes('INSERT INTO avatar_gpu_workers_sql')) {
    const [id, slot, accountEmail, provider, gpu, totalVram, availVram, cuda, python, models, category, heartbeat, expiry, reg, upd] = args as any[];
    mockWorkers.set(id, {
      id, slot_number: slot, account_email: accountEmail, provider, gpu_model: gpu, total_vram_mb: totalVram, available_vram_mb: availVram,
      cuda_version: cuda, python_version: python, installed_models_json: models, assigned_task_category: category,
      status: 'idle', current_job_id: null, last_heartbeat_at: heartbeat, runtime_expires_at: expiry, registered_at: reg, updated_at: upd,
    });
    return { rows: [], rowsAffected: 1 };
  }

  if (sql.includes('SELECT * FROM avatar_gpu_workers_sql WHERE id = ?')) {
    const id = String(args[0]);
    const row = mockWorkers.get(id);
    return { rows: row ? [row] : [], rowsAffected: 0 };
  }

  if (sql.includes('UPDATE avatar_gpu_workers_sql SET status = ?')) {
    const [status, jobId, now, id] = args as any[];
    const worker = mockWorkers.get(id);
    if (worker) {
      worker.status = status;
      worker.current_job_id = jobId;
      worker.updated_at = now;
      return { rows: [], rowsAffected: 1 };
    }
    return { rows: [], rowsAffected: 0 };
  }

  // Tasks
  if (sql.includes('INSERT INTO avatar_gpu_tasks_sql')) {
    const [id, parentId, category, reqModel, minVram, maxRetries, payload, created, updated] = args as any[];
    mockTasks.set(id, {
      id,
      parent_render_job_id: parentId,
      task_category: category,
      required_model: reqModel,
      min_vram_mb: minVram,
      assigned_worker_id: null,
      status: 'queued',
      retry_count: 0,
      max_retries: maxRetries,
      input_payload_json: payload,
      output_artifact_url: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      created_at: created,
      updated_at: updated,
    });
    return { rows: [], rowsAffected: 1 };
  }

  if (sql.includes('SELECT * FROM avatar_gpu_tasks_sql WHERE id = ?')) {
    const id = String(args[0]);
    const row = mockTasks.get(id);
    return { rows: row ? [row] : [], rowsAffected: 0 };
  }

  if (sql.includes('SELECT * FROM avatar_gpu_tasks_sql') && sql.includes("WHERE status = 'queued'")) {
    const [cat, availVram] = args as any[];
    const matching = Array.from(mockTasks.values()).filter(
      (t) => t.status === 'queued' && t.task_category === cat && (t.min_vram_mb as number) <= (availVram as number)
    );
    return { rows: matching, rowsAffected: 0 };
  }

  if (sql.includes('UPDATE avatar_gpu_tasks_sql') && sql.includes("SET status = 'running'")) {
    const [workerId, now, , taskId] = args as any[];
    const task = mockTasks.get(taskId);
    if (task && task.status === 'queued') {
      task.status = 'running';
      task.assigned_worker_id = workerId;
      task.started_at = now;
      return { rows: [], rowsAffected: 1 };
    }
    return { rows: [], rowsAffected: 0 };
  }

  if (sql.includes('UPDATE avatar_gpu_tasks_sql') && sql.includes("SET status = 'completed'")) {
    const [outputUrl, now, , taskId, workerId] = args as any[];
    const task = mockTasks.get(taskId);
    if (task && task.status === 'running' && task.assigned_worker_id === workerId) {
      task.status = 'completed';
      task.output_artifact_url = outputUrl;
      task.completed_at = now;
      return { rows: [], rowsAffected: 1 };
    }
    return { rows: [], rowsAffected: 0 };
  }

  if (sql.includes('UPDATE avatar_gpu_tasks_sql') && sql.includes('retry_count = ?')) {
    const [newStatus, newRetries, errorMsg, now, taskId, workerId] = args as any[];
    const task = mockTasks.get(taskId);
    if (task) {
      task.status = newStatus;
      task.retry_count = newRetries;
      task.error_message = errorMsg;
      task.assigned_worker_id = null;
      task.updated_at = now;
      return { rows: [], rowsAffected: 1 };
    }
    return { rows: [], rowsAffected: 0 };
  }

  return { rows: [], rowsAffected: 0 };
}

describe('Intelligent GPU Scheduler Tests', () => {
  beforeEach(() => {
    mockWorkers.clear();
    mockTasks.clear();
    (bunnyExecute as jest.Mock).mockImplementation(fakeExecute);
  });

  it('enforces VRAM minimums across the 4 task categories', () => {
    expect(VRAM_REQUIREMENTS.lip_sync_musetalk.minMb).toBe(6144);
    expect(VRAM_REQUIREMENTS.face_reconstruction.minMb).toBe(4096);
    expect(VRAM_REQUIREMENTS.motion_generation.minMb).toBe(4096);
    expect(VRAM_REQUIREMENTS.scene_enhancement.minMb).toBe(8192);
  });

  it('enqueues a task and assigns it only to a compatible idle worker with sufficient VRAM', async () => {
    // Register worker 1 (Colab, 15GB VRAM, MuseTalk)
    await GpuWorkerRegistry.registerWorker({
      workerId: 'worker-colab-1',
      slotNumber: 1,
      provider: 'google_colab',
      gpuModel: 'Tesla T4',
      totalVramMb: 15360,
      availableVramMb: 14000,
      cudaVersion: '12.2',
      pythonVersion: '3.10',
      installedModels: ['MuseTalk'],
      assignedTaskCategory: 'lip_sync_musetalk',
    });

    // Enqueue MuseTalk task
    const task = await GpuScheduler.enqueueTask({
      parentRenderJobId: 'render_job_001',
      taskCategory: 'lip_sync_musetalk',
      requiredModel: 'MuseTalk',
      inputPayload: { script: 'नमस्ते', audioUrl: 'https://cdn/speech.mp3' },
    });
    expect(task.status).toBe('queued');

    // Worker claims the task
    const claimed = await GpuScheduler.claimNextTaskForWorker('worker-colab-1');
    expect(claimed).not.toBeNull();
    expect(claimed?.id).toBe(task.id);
    expect(claimed?.status).toBe('running');
    expect(claimed?.assignedWorkerId).toBe('worker-colab-1');

    // Verify worker is now busy and cannot claim another concurrent task
    const worker = await GpuWorkerRegistry.getWorkerById('worker-colab-1');
    expect(worker?.status).toBe('busy');

    const secondClaim = await GpuScheduler.claimNextTaskForWorker('worker-colab-1');
    expect(secondClaim).toBeNull();
  });

  it('completes the task and releases the GPU worker back to idle', async () => {
    await GpuWorkerRegistry.registerWorker({
      workerId: 'worker-colab-1',
      slotNumber: 1,
      provider: 'google_colab',
      gpuModel: 'Tesla T4',
      totalVramMb: 15360,
      availableVramMb: 14000,
      cudaVersion: '12.2',
      pythonVersion: '3.10',
      installedModels: ['MuseTalk'],
      assignedTaskCategory: 'lip_sync_musetalk',
    });

    const task = await GpuScheduler.enqueueTask({
      parentRenderJobId: 'render_job_002',
      taskCategory: 'lip_sync_musetalk',
      inputPayload: {},
    });

    await GpuScheduler.claimNextTaskForWorker('worker-colab-1');

    const completed = await GpuScheduler.completeTask({
      taskId: task.id,
      workerId: 'worker-colab-1',
      outputArtifactUrl: 'https://swaryogacrm.b-cdn.net/output/final_1080p.mp4',
    });

    expect(completed.status).toBe('completed');
    expect(completed.outputArtifactUrl).toBe('https://swaryogacrm.b-cdn.net/output/final_1080p.mp4');

    // Verify worker is released
    const worker = await GpuWorkerRegistry.getWorkerById('worker-colab-1');
    expect(worker?.status).toBe('idle');
    expect(worker?.currentJobId).toBeNull();
  });

  it('handles task failure with retry counter and re-queuing', async () => {
    await GpuWorkerRegistry.registerWorker({
      workerId: 'worker-colab-1',
      slotNumber: 1,
      provider: 'google_colab',
      gpuModel: 'Tesla T4',
      totalVramMb: 15360,
      availableVramMb: 14000,
      cudaVersion: '12.2',
      pythonVersion: '3.10',
      installedModels: ['MuseTalk'],
      assignedTaskCategory: 'lip_sync_musetalk',
    });

    const task = await GpuScheduler.enqueueTask({
      parentRenderJobId: 'render_job_003',
      taskCategory: 'lip_sync_musetalk',
      inputPayload: {},
    });

    await GpuScheduler.claimNextTaskForWorker('worker-colab-1');

    // First failure should increment retry count and re-queue
    const failedTask = await GpuScheduler.failTask({
      taskId: task.id,
      workerId: 'worker-colab-1',
      errorMessage: 'Transient CUDA OOM',
    });

    expect(failedTask.retryCount).toBe(1);
    expect(failedTask.status).toBe('queued'); // Re-queued for retry

    // Worker must be released
    const worker = await GpuWorkerRegistry.getWorkerById('worker-colab-1');
    expect(worker?.status).toBe('idle');
  });
});

