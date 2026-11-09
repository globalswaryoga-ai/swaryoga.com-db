const mockWorkers = new Map<string, Record<string, unknown>>();

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { GpuWorkerRegistry } from '@/lib/avatarEngine/gpuWorkerRegistry';

function fakeExecute(statement: { sql: string; args?: unknown[] } | string) {
  const sql = typeof statement === 'string' ? statement : statement.sql;
  const args = typeof statement === 'string' ? [] : statement.args || [];

  if (sql.includes('PRAGMA table_info')) {
    return { rows: [{ name: 'account_email' }], rowsAffected: 0 };
  }

  if (sql.includes('INSERT INTO avatar_gpu_workers_sql')) {
    const [id, slot, accountEmail, provider, gpu, totalVram, availVram, cuda, python, models, category, heartbeat, expiry, reg, upd] = args as any[];
    mockWorkers.set(id, {
      id,
      slot_number: slot,
      account_email: accountEmail,
      provider,
      gpu_model: gpu,
      total_vram_mb: totalVram,
      available_vram_mb: availVram,
      cuda_version: cuda,
      python_version: python,
      installed_models_json: models,
      assigned_task_category: category,
      status: 'idle',
      current_job_id: null,
      last_heartbeat_at: heartbeat,
      runtime_expires_at: expiry,
      registered_at: reg,
      updated_at: upd,
    });
    return { rows: [], rowsAffected: 1 };
  }

  if (sql.includes('SELECT * FROM avatar_gpu_workers_sql WHERE id = ?')) {
    const id = String(args[0]);
    const row = mockWorkers.get(id);
    return { rows: row ? [row] : [], rowsAffected: 0 };
  }

  if (sql.includes('SELECT * FROM avatar_gpu_workers_sql')) {
    return { rows: Array.from(mockWorkers.values()), rowsAffected: 0 };
  }

  if (sql.includes('UPDATE avatar_gpu_workers_sql SET last_heartbeat_at = ?')) {
    const [now, availVram, , id] = args as any[];
    const worker = mockWorkers.get(id);
    if (worker) {
      worker.last_heartbeat_at = now;
      if (availVram !== undefined) worker.available_vram_mb = availVram;
      return { rows: [], rowsAffected: 1 };
    }
    return { rows: [], rowsAffected: 0 };
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

  return { rows: [], rowsAffected: 0 };
}

describe('GPU Worker Registry Tests (Two Google Accounts)', () => {
  beforeEach(() => {
    mockWorkers.clear();
    (bunnyExecute as jest.Mock).mockImplementation(fakeExecute);
  });

  it('allocates correct default Google account and provider per slot', () => {
    // Google Account 1: swarsakshi9@gmail.com
    expect(GpuWorkerRegistry.getDefaultAccountForSlot(1)).toBe('swarsakshi9@gmail.com');
    expect(GpuWorkerRegistry.getDefaultProviderForSlot(1)).toBe('google_colab');
    expect(GpuWorkerRegistry.getDefaultCategoryForSlot(1)).toBe('lip_sync_musetalk');

    expect(GpuWorkerRegistry.getDefaultAccountForSlot(3)).toBe('swarsakshi9@gmail.com');
    expect(GpuWorkerRegistry.getDefaultProviderForSlot(3)).toBe('kaggle');
    expect(GpuWorkerRegistry.getDefaultCategoryForSlot(3)).toBe('motion_generation');

    // Google Account 2: swarsakshi9999@gmail.com
    expect(GpuWorkerRegistry.getDefaultAccountForSlot(2)).toBe('swarsakshi9999@gmail.com');
    expect(GpuWorkerRegistry.getDefaultProviderForSlot(2)).toBe('google_colab');
    expect(GpuWorkerRegistry.getDefaultCategoryForSlot(2)).toBe('face_reconstruction');

    expect(GpuWorkerRegistry.getDefaultAccountForSlot(4)).toBe('swarsakshi9999@gmail.com');
    expect(GpuWorkerRegistry.getDefaultProviderForSlot(4)).toBe('kaggle');
    expect(GpuWorkerRegistry.getDefaultCategoryForSlot(4)).toBe('scene_enhancement');
  });

  it('registers workers with their specific account emails and detected hardware', async () => {
    const worker1 = await GpuWorkerRegistry.registerWorker({
      workerId: 'colab-worker-1-musetalk',
      slotNumber: 1,
      accountEmail: 'swarsakshi9@gmail.com',
      provider: 'google_colab',
      gpuModel: 'NVIDIA Tesla T4',
      totalVramMb: 15360,
      availableVramMb: 14200,
      cudaVersion: '12.2',
      pythonVersion: '3.10.12',
      installedModels: ['MuseTalk', 'whisper'],
    });

    expect(worker1.slotNumber).toBe(1);
    expect(worker1.accountEmail).toBe('swarsakshi9@gmail.com');
    expect(worker1.provider).toBe('google_colab');
    expect(worker1.assignedTaskCategory).toBe('lip_sync_musetalk');

    const worker4 = await GpuWorkerRegistry.registerWorker({
      workerId: 'kaggle-worker-4-scene',
      slotNumber: 4,
      accountEmail: 'swarsakshi9999@gmail.com',
      provider: 'kaggle',
      gpuModel: 'NVIDIA Tesla P100',
      totalVramMb: 16280,
      availableVramMb: 15100,
      cudaVersion: '12.1',
      pythonVersion: '3.10.10',
      installedModels: ['Real-ESRGAN-x4plus', 'CodeFormer'],
    });

    expect(worker4.slotNumber).toBe(4);
    expect(worker4.accountEmail).toBe('swarsakshi9999@gmail.com');
    expect(worker4.provider).toBe('kaggle');
    expect(worker4.assignedTaskCategory).toBe('scene_enhancement');
  });

  it('returns all 4 slots even when offline, strictly marking unregistered slots as offline', async () => {
    const allWorkers = await GpuWorkerRegistry.getAllWorkers();
    expect(allWorkers.length).toBe(4);

    // Unregistered slots must not be claimed online
    for (const w of allWorkers) {
      expect(w.status).toBe('offline');
    }

    expect(allWorkers[0].accountEmail).toBe('swarsakshi9@gmail.com');
    expect(allWorkers[1].accountEmail).toBe('swarsakshi9999@gmail.com');
    expect(allWorkers[2].accountEmail).toBe('swarsakshi9@gmail.com');
    expect(allWorkers[3].accountEmail).toBe('swarsakshi9999@gmail.com');
  });
});
