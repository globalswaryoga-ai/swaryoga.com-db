/**
 * Swar Yoga In-House AI Avatar - GPU Worker Registry
 * ==================================================
 * Manages the registration, health, VRAM, and runtime lifecycle for 4 independent
 * free GPU inference workers (Google Colab & Kaggle).
 * 
 * Persistence: Bunny Edge SQL (table: avatar_gpu_workers_sql).
 * Auth: Token-based HMAC verification via AVATAR_WORKER_TOKEN.
 */

import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';

export type GpuProvider = 'google_colab' | 'kaggle' | 'self_hosted';
export type GpuWorkerStatus = 'idle' | 'busy' | 'offline' | 'expired';
export type GpuTaskCategory =
  | 'lip_sync_musetalk'
  | 'face_reconstruction'
  | 'motion_generation'
  | 'scene_enhancement';

export interface GpuWorkerRecord {
  id: string;                         // e.g. "colab-worker-1-musetalk"
  slotNumber: number;                 // 1, 2, 3, or 4
  accountEmail: string;               // e.g. "swarsakshi9@gmail.com" or "swarsakshi9999@gmail.com"
  provider: GpuProvider;              // 'google_colab' | 'kaggle'
  gpuModel: string;                   // e.g. "NVIDIA Tesla T4" (detected dynamically)
  totalVramMb: number;                // e.g. 15360 (16GB)
  availableVramMb: number;            // e.g. 14200
  cudaVersion: string;                // e.g. "12.2"
  pythonVersion: string;              // e.g. "3.10.12"
  installedModels: string[];          // e.g. ["MuseTalk", "whisper", "face-alignment"]
  assignedTaskCategory: GpuTaskCategory;
  status: GpuWorkerStatus;
  currentJobId: string | null;
  lastHeartbeatAt: string;
  runtimeExpiresAt: string | null;
  registeredAt: string;
  updatedAt: string;
}

export interface GpuWorkerRegistration {
  workerId: string;
  slotNumber?: number;
  accountEmail?: string;
  provider: GpuProvider;
  gpuModel: string;
  totalVramMb: number;
  availableVramMb: number;
  cudaVersion: string;
  pythonVersion: string;
  installedModels: string[];
  assignedTaskCategory?: GpuTaskCategory;
  sessionDurationMinutes?: number;    // Colab ~720m (12h), Kaggle ~540m (9h)
}

export interface GpuWorkerHeartbeatStats {
  availableVramMb?: number;
  gpuTemperatureC?: number;
  gpuUtilizationPct?: number;
  currentJobId?: string | null;
}

const TABLE_WORKERS = 'avatar_gpu_workers_sql';
const HEARTBEAT_TIMEOUT_SECONDS = 90; // If no ping within 90s, mark offline

export class GpuWorkerRegistry {
  private static schemaPromise: Promise<void> | null = null;

  public static async initSchema(): Promise<void> {
    if (!this.schemaPromise) {
      this.schemaPromise = bunnyBatch([
        {
          sql: `CREATE TABLE IF NOT EXISTS ${TABLE_WORKERS} (
            id TEXT PRIMARY KEY,
            slot_number INTEGER NOT NULL DEFAULT 1,
            account_email TEXT NOT NULL DEFAULT '',
            provider TEXT NOT NULL,
            gpu_model TEXT NOT NULL,
            total_vram_mb INTEGER NOT NULL,
            available_vram_mb INTEGER NOT NULL,
            cuda_version TEXT NOT NULL,
            python_version TEXT NOT NULL,
            installed_models_json TEXT NOT NULL DEFAULT '[]',
            assigned_task_category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'offline',
            current_job_id TEXT,
            last_heartbeat_at TEXT NOT NULL,
            runtime_expires_at TEXT,
            registered_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )`,
        },
      ])
        .then(() => this.ensureAccountEmailColumn())
        .catch((error) => {
          this.schemaPromise = null;
          throw error;
        });
    }
    await this.schemaPromise;
  }

  private static async ensureAccountEmailColumn(): Promise<void> {
    try {
      const columns = await bunnyExecute(`PRAGMA table_info(${TABLE_WORKERS})`);
      if (columns.rows.some((row: any) => String(row.name) === 'account_email')) return;
      await bunnyExecute(`ALTER TABLE ${TABLE_WORKERS} ADD COLUMN account_email TEXT NOT NULL DEFAULT ''`);
    } catch {
      // Column may already exist or table already has it
    }
  }

  /**
   * Maps slot number (1-4) to assigned Google Account.
   */
  public static getDefaultAccountForSlot(slot: number): string {
    switch (slot) {
      case 1:
        return 'swarsakshi9@gmail.com';
      case 2:
        return 'swarsakshi9999@gmail.com';
      case 3:
        return 'swarsakshi9@gmail.com';
      case 4:
        return 'swarsakshi9999@gmail.com';
      default:
        return 'swarsakshi9@gmail.com';
    }
  }

  /**
   * Maps slot number (1-4) to default platform provider.
   */
  public static getDefaultProviderForSlot(slot: number): GpuProvider {
    switch (slot) {
      case 1:
        return 'google_colab';
      case 2:
        return 'google_colab';
      case 3:
        return 'kaggle';
      case 4:
        return 'kaggle';
      default:
        return 'google_colab';
    }
  }

  /**
   * Maps slot number (1-4) to default task category.
   */
  public static getDefaultCategoryForSlot(slot: number): GpuTaskCategory {
    switch (slot) {
      case 1:
        return 'lip_sync_musetalk';
      case 2:
        return 'face_reconstruction';
      case 3:
        return 'motion_generation';
      case 4:
        return 'scene_enhancement';
      default:
        return 'lip_sync_musetalk';
    }
  }

  /**
   * Registers a new or returning GPU worker.
   */
  public static async registerWorker(data: GpuWorkerRegistration): Promise<GpuWorkerRecord> {
    await this.initSchema();
    const now = new Date().toISOString();

    const slot = data.slotNumber && data.slotNumber >= 1 && data.slotNumber <= 4
      ? data.slotNumber
      : 1;

    const assignedCategory = data.assignedTaskCategory || this.getDefaultCategoryForSlot(slot);
    const accountEmail = data.accountEmail || this.getDefaultAccountForSlot(slot);
    const provider = data.provider || this.getDefaultProviderForSlot(slot);

    // Compute expected runtime expiry (Google Colab = 12h, Kaggle = 9h)
    const durationMinutes = data.sessionDurationMinutes || (provider === 'google_colab' ? 720 : 540);
    const runtimeExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const modelsJson = JSON.stringify(data.installedModels || []);

    await bunnyExecute({
      sql: `INSERT INTO ${TABLE_WORKERS} (
        id, slot_number, account_email, provider, gpu_model, total_vram_mb, available_vram_mb,
        cuda_version, python_version, installed_models_json, assigned_task_category,
        status, current_job_id, last_heartbeat_at, runtime_expires_at, registered_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', NULL, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slot_number = excluded.slot_number,
        account_email = excluded.account_email,
        provider = excluded.provider,
        gpu_model = excluded.gpu_model,
        total_vram_mb = excluded.total_vram_mb,
        available_vram_mb = excluded.available_vram_mb,
        cuda_version = excluded.cuda_version,
        python_version = excluded.python_version,
        installed_models_json = excluded.installed_models_json,
        assigned_task_category = excluded.assigned_task_category,
        status = 'idle',
        last_heartbeat_at = excluded.last_heartbeat_at,
        runtime_expires_at = excluded.runtime_expires_at,
        updated_at = excluded.updated_at`,
      args: [
        data.workerId,
        slot,
        accountEmail,
        provider,
        data.gpuModel,
        data.totalVramMb,
        data.availableVramMb,
        data.cudaVersion,
        data.pythonVersion,
        modelsJson,
        assignedCategory,
        now,
        runtimeExpiresAt,
        now,
        now,
      ],
    });

    const record = await this.getWorkerById(data.workerId);
    if (!record) throw new Error(`Worker ${data.workerId} registration could not be verified.`);
    return record;
  }

  /**
   * Updates worker heartbeat and available VRAM.
   */
  public static async recordHeartbeat(
    workerId: string,
    stats: GpuWorkerHeartbeatStats = {}
  ): Promise<boolean> {
    await this.initSchema();
    const now = new Date().toISOString();

    const sql = stats.availableVramMb !== undefined
      ? `UPDATE ${TABLE_WORKERS} SET last_heartbeat_at = ?, available_vram_mb = ?, updated_at = ? WHERE id = ?`
      : `UPDATE ${TABLE_WORKERS} SET last_heartbeat_at = ?, updated_at = ? WHERE id = ?`;

    const args = stats.availableVramMb !== undefined
      ? [now, stats.availableVramMb, now, workerId]
      : [now, now, workerId];

    const res = await bunnyExecute({ sql, args });
    return (res.rowsAffected || 0) > 0;
  }

  /**
   * Updates worker execution status ('idle' | 'busy' | 'offline').
   */
  public static async updateWorkerStatus(
    workerId: string,
    status: GpuWorkerStatus,
    currentJobId: string | null = null
  ): Promise<void> {
    await this.initSchema();
    const now = new Date().toISOString();

    await bunnyExecute({
      sql: `UPDATE ${TABLE_WORKERS} SET status = ?, current_job_id = ?, updated_at = ? WHERE id = ?`,
      args: [status, currentJobId, now, workerId],
    });
  }

  /**
   * Retrieves all 4 GPU worker slots with live health check.
   * Guarantees that slots 1-4 are always populated with their assigned Google account.
   */
  public static async getAllWorkers(): Promise<GpuWorkerRecord[]> {
    await this.initSchema();
    const res = await bunnyExecute(`SELECT * FROM ${TABLE_WORKERS} ORDER BY slot_number ASC, registered_at ASC`);

    const now = Date.now();
    const registeredRows = (res.rows || []).map((row: any) => {
      let models: string[] = [];
      try {
        models = JSON.parse(row.installed_models_json || '[]');
      } catch {
        models = [];
      }

      const slotNum = Number(row.slot_number || 1);
      // Check heartbeat freshness
      const lastHeartbeat = new Date(row.last_heartbeat_at).getTime();
      const isHeartbeatExpired = (now - lastHeartbeat) > (HEARTBEAT_TIMEOUT_SECONDS * 1000);

      // Check session expiry
      const runtimeExpiry = row.runtime_expires_at ? new Date(row.runtime_expires_at).getTime() : Infinity;
      const isSessionExpired = now > runtimeExpiry;

      let effectiveStatus: GpuWorkerStatus = row.status as GpuWorkerStatus;
      if (isSessionExpired) {
        effectiveStatus = 'expired';
      } else if (isHeartbeatExpired) {
        effectiveStatus = 'offline';
      }

      return {
        id: String(row.id),
        slotNumber: slotNum,
        accountEmail: String(row.account_email || this.getDefaultAccountForSlot(slotNum)),
        provider: (row.provider as GpuProvider) || this.getDefaultProviderForSlot(slotNum),
        gpuModel: String(row.gpu_model || 'Awaiting hardware detection'),
        totalVramMb: Number(row.total_vram_mb || 0),
        availableVramMb: Number(row.available_vram_mb || 0),
        cudaVersion: String(row.cuda_version || 'N/A'),
        pythonVersion: String(row.python_version || 'N/A'),
        installedModels: models,
        assignedTaskCategory: (row.assigned_task_category as GpuTaskCategory) || this.getDefaultCategoryForSlot(slotNum),
        status: effectiveStatus,
        currentJobId: row.current_job_id ? String(row.current_job_id) : null,
        lastHeartbeatAt: String(row.last_heartbeat_at),
        runtimeExpiresAt: row.runtime_expires_at ? String(row.runtime_expires_at) : null,
        registeredAt: String(row.registered_at),
        updatedAt: String(row.updated_at),
      };
    });

    // Ensure all 4 slots are present
    const result: GpuWorkerRecord[] = [];
    for (let slot = 1; slot <= 4; slot++) {
      const existing = registeredRows.find(r => r.slotNumber === slot);
      if (existing) {
        result.push(existing);
      } else {
        // Pre-configured unregistered slot: strictly offline until live heartbeat
        result.push({
          id: `worker-slot-${slot}`,
          slotNumber: slot,
          accountEmail: this.getDefaultAccountForSlot(slot),
          provider: this.getDefaultProviderForSlot(slot),
          gpuModel: 'Awaiting hardware detection on startup',
          totalVramMb: 0,
          availableVramMb: 0,
          cudaVersion: 'N/A',
          pythonVersion: 'N/A',
          installedModels: [],
          assignedTaskCategory: this.getDefaultCategoryForSlot(slot),
          status: 'offline',
          currentJobId: null,
          lastHeartbeatAt: new Date(0).toISOString(),
          runtimeExpiresAt: null,
          registeredAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        });
      }
    }

    return result;
  }

  /**
   * Retrieves single worker by ID.
   */
  public static async getWorkerById(workerId: string): Promise<GpuWorkerRecord | null> {
    await this.initSchema();
    const res = await bunnyExecute({
      sql: `SELECT * FROM ${TABLE_WORKERS} WHERE id = ?`,
      args: [workerId],
    });
    const row = res.rows?.[0] as any;
    if (!row) return null;

    let models: string[] = [];
    try {
      models = JSON.parse(row.installed_models_json || '[]');
    } catch {
      models = [];
    }

    const slotNum = Number(row.slot_number || 1);
    return {
      id: String(row.id),
      slotNumber: slotNum,
      accountEmail: String(row.account_email || this.getDefaultAccountForSlot(slotNum)),
      provider: (row.provider as GpuProvider) || this.getDefaultProviderForSlot(slotNum),
      gpuModel: String(row.gpu_model),
      totalVramMb: Number(row.total_vram_mb),
      availableVramMb: Number(row.available_vram_mb),
      cudaVersion: String(row.cuda_version),
      pythonVersion: String(row.python_version),
      installedModels: models,
      assignedTaskCategory: (row.assigned_task_category as GpuTaskCategory) || this.getDefaultCategoryForSlot(slotNum),
      status: row.status as GpuWorkerStatus,
      currentJobId: row.current_job_id ? String(row.current_job_id) : null,
      lastHeartbeatAt: String(row.last_heartbeat_at),
      runtimeExpiresAt: row.runtime_expires_at ? String(row.runtime_expires_at) : null,
      registeredAt: String(row.registered_at),
      updatedAt: String(row.updated_at),
    };
  }

  /**
   * Scans for workers with expired heartbeats and marks them offline.
   */
  public static async cleanExpiredWorkers(): Promise<string[]> {
    await this.initSchema();
    const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_SECONDS * 1000).toISOString();

    const expired = await bunnyExecute({
      sql: `SELECT id FROM ${TABLE_WORKERS} WHERE status IN ('idle', 'busy') AND last_heartbeat_at < ?`,
      args: [cutoff],
    });

    const ids = (expired.rows || []).map((r: any) => String(r.id));
    if (ids.length > 0) {
      const now = new Date().toISOString();
      await bunnyExecute({
        sql: `UPDATE ${TABLE_WORKERS} SET status = 'offline', current_job_id = NULL, updated_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
        args: [now, ...ids],
      });
    }

    return ids;
  }
}

