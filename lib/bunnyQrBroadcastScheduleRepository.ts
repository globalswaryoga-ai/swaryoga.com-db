import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export type BunnyQrBroadcastSchedule = Record<string, any> & { _id: string };

let schemaPromise: Promise<void> | null = null;

export async function ensureBunnyQrBroadcastScheduleSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = bunnyBatch([
      {
        sql: `CREATE TABLE IF NOT EXISTS qr_broadcast_schedules_sql (
          document_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          frequency TEXT NOT NULL,
          status TEXT NOT NULL,
          is_active INTEGER NOT NULL,
          start_time TEXT,
          processing_lock_until TEXT,
          custom_schedule_dates_json TEXT NOT NULL DEFAULT '[]',
          data_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        args: [],
      },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_qr_sched_owner_created ON qr_broadcast_schedules_sql(user_id, created_at)', args: [] },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_qr_sched_active ON qr_broadcast_schedules_sql(is_active, status, frequency)', args: [] },
    ]).then(() => undefined).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}

export async function listDueBunnyQrBroadcastSchedules(): Promise<BunnyQrBroadcastSchedule[]> {
  await ensureBunnyQrBroadcastScheduleSchema();
  const result = await bunnyExecute({
    sql: `SELECT * FROM qr_broadcast_schedules_sql
      WHERE is_active = 1 AND status IN ('draft','scheduled','in-progress','paused')
      ORDER BY created_at ASC`,
    args: [],
  });
  return result.rows.map(parseSchedule);
}

function parseSchedule(row: any): BunnyQrBroadcastSchedule {
  const data = JSON.parse(String(row.data_json || '{}'));
  return {
    ...data,
    _id: String(row.document_id),
    userId: String(row.user_id),
    createdBy: String(row.created_by),
    frequency: String(row.frequency),
    status: String(row.status),
    isActive: Boolean(row.is_active),
    startTime: row.start_time || data.startTime,
    processingLockUntil: row.processing_lock_until ? new Date(row.processing_lock_until) : data.processingLockUntil,
    customScheduleDates: JSON.parse(String(row.custom_schedule_dates_json || '[]')).map((date: string) => new Date(date)),
    createdAt: row.created_at || data.createdAt,
    updatedAt: row.updated_at || data.updatedAt,
  };
}

function scheduleArgs(schedule: BunnyQrBroadcastSchedule, timestamp: string) {
  return [
    schedule._id,
    schedule.userId,
    schedule.createdBy,
    schedule.frequency || 'once',
    schedule.status || 'scheduled',
    schedule.isActive === false ? 0 : 1,
    schedule.startTime || null,
    schedule.processingLockUntil ? new Date(schedule.processingLockUntil).toISOString() : null,
    JSON.stringify((schedule.customScheduleDates || []).map((date: any) => new Date(date).toISOString())),
    JSON.stringify(schedule),
    schedule.createdAt || timestamp,
    timestamp,
  ];
}

export async function createBunnyQrBroadcastSchedule(input: Record<string, any>): Promise<BunnyQrBroadcastSchedule> {
  await ensureBunnyQrBroadcastScheduleSchema();
  const timestamp = new Date().toISOString();
  const schedule = {
    ...input,
    _id: String(input._id || crypto.randomUUID()),
    createdAt: timestamp,
    updatedAt: timestamp,
  } as BunnyQrBroadcastSchedule;
  await bunnyExecute({
    sql: `INSERT INTO qr_broadcast_schedules_sql
      (document_id,user_id,created_by,frequency,status,is_active,start_time,processing_lock_until,custom_schedule_dates_json,data_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: scheduleArgs(schedule, timestamp),
  });
  return schedule;
}

function getPath(target: Record<string, any>, path: string): any {
  return path.split('.').reduce((value, key) => value?.[key], target);
}

function setPath(target: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.');
  let current = target;
  for (const part of parts.slice(0, -1)) current = current[part] ||= {};
  current[parts[parts.length - 1]] = value;
}

export async function patchBunnyQrBroadcastSchedule(
  id: string,
  update: Record<string, any>,
): Promise<BunnyQrBroadcastSchedule | null> {
  const current = await getBunnyQrBroadcastSchedule(id);
  if (!current) return null;
  const schedule = { ...current } as BunnyQrBroadcastSchedule;
  const set = update.$set || update;
  for (const [path, value] of Object.entries(set)) setPath(schedule, path, value);
  for (const [path, value] of Object.entries(update.$inc || {})) {
    setPath(schedule, path, Number(getPath(schedule, path) || 0) + Number(value));
  }
  for (const [path, specification] of Object.entries(update.$addToSet || {})) {
    const currentValues: any[] = Array.isArray(getPath(schedule, path)) ? [...getPath(schedule, path)] : [];
    const values = (specification as any)?.$each || [specification];
    for (const value of values) {
      if (!currentValues.some(existing => existing === value)) currentValues.push(value);
    }
    setPath(schedule, path, currentValues);
  }
  for (const path of Object.keys(update.$unset || {})) {
    const parts = path.split('.');
    const leaf = parts.pop()!;
    const parent = parts.length ? getPath(schedule, parts.join('.')) : schedule;
    if (parent && typeof parent === 'object') delete parent[leaf];
  }
  const timestamp = new Date().toISOString();
  schedule.updatedAt = timestamp;
  await bunnyExecute({
    sql: `UPDATE qr_broadcast_schedules_sql
      SET frequency=?, status=?, is_active=?, start_time=?, custom_schedule_dates_json=?, data_json=?, updated_at=?
      WHERE document_id=?`,
    args: [
      schedule.frequency || 'once',
      schedule.status || 'scheduled',
      schedule.isActive === false ? 0 : 1,
      schedule.startTime || null,
      JSON.stringify((schedule.customScheduleDates || []).map((date: any) => new Date(date).toISOString())),
      JSON.stringify(schedule),
      timestamp,
      id,
    ],
  });
  return schedule;
}

export async function claimBunnyQrBroadcastSchedule(id: string, lockUntil: Date): Promise<boolean> {
  await ensureBunnyQrBroadcastScheduleSchema();
  const result = await bunnyExecute({
    sql: `UPDATE qr_broadcast_schedules_sql SET processing_lock_until=?
      WHERE document_id=? AND (processing_lock_until IS NULL OR processing_lock_until<=?)`,
    args: [lockUntil.toISOString(), id, new Date().toISOString()],
  });
  return result.rowsAffected > 0;
}

export async function releaseBunnyQrBroadcastSchedule(id: string): Promise<void> {
  await ensureBunnyQrBroadcastScheduleSchema();
  await bunnyExecute({
    sql: 'UPDATE qr_broadcast_schedules_sql SET processing_lock_until=NULL WHERE document_id=?',
    args: [id],
  });
}

export async function listBunnyQrBroadcastSchedules(options: {
  userId?: string;
  status?: string;
  search?: string;
  activeOnly?: boolean;
  limit?: number;
} = {}): Promise<BunnyQrBroadcastSchedule[]> {
  await ensureBunnyQrBroadcastScheduleSchema();
  const where = ['1 = 1'];
  const args: Array<string | number> = [];
  if (options.userId) {
    where.push('(user_id = ? OR created_by = ?)');
    args.push(options.userId, options.userId);
  }
  if (options.status) {
    where.push('status = ?');
    args.push(options.status);
  }
  if (options.activeOnly) where.push('is_active = 1');
  if (options.search) {
    where.push('LOWER(data_json) LIKE ?');
    args.push(`%${options.search.toLowerCase()}%`);
  }
  args.push(Math.min(Math.max(options.limit || 100, 1), 1000));
  const result = await bunnyExecute({
    sql: `SELECT * FROM qr_broadcast_schedules_sql WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
    args,
  });
  return result.rows.map(parseSchedule);
}

export async function getBunnyQrBroadcastSchedule(id: string, userId?: string): Promise<BunnyQrBroadcastSchedule | null> {
  await ensureBunnyQrBroadcastScheduleSchema();
  const result = await bunnyExecute({
    sql: `SELECT * FROM qr_broadcast_schedules_sql WHERE document_id = ?${userId ? ' AND (user_id = ? OR created_by = ?)' : ''} LIMIT 1`,
    args: userId ? [id, userId, userId] : [id],
  });
  return result.rows[0] ? parseSchedule(result.rows[0]) : null;
}

export async function updateBunnyQrBroadcastSchedule(
  id: string,
  userId: string,
  updates: Record<string, any>,
): Promise<BunnyQrBroadcastSchedule | null> {
  const existing = await getBunnyQrBroadcastSchedule(id, userId);
  if (!existing) return null;
  const timestamp = new Date().toISOString();
  const schedule = { ...existing, ...updates, _id: id, updatedAt: timestamp } as BunnyQrBroadcastSchedule;
  await bunnyExecute({
    sql: `UPDATE qr_broadcast_schedules_sql
      SET frequency=?, status=?, is_active=?, start_time=?, custom_schedule_dates_json=?, data_json=?, updated_at=?
      WHERE document_id=? AND (user_id=? OR created_by=?)`,
    args: [
      schedule.frequency || 'once',
      schedule.status || 'scheduled',
      schedule.isActive === false ? 0 : 1,
      schedule.startTime || null,
      JSON.stringify((schedule.customScheduleDates || []).map((date: any) => new Date(date).toISOString())),
      JSON.stringify(schedule),
      timestamp,
      id,
      userId,
      userId,
    ],
  });
  return schedule;
}

export async function deleteBunnyQrBroadcastSchedule(id: string, userId: string): Promise<boolean> {
  await ensureBunnyQrBroadcastScheduleSchema();
  const result = await bunnyExecute({
    sql: 'DELETE FROM qr_broadcast_schedules_sql WHERE document_id=? AND (user_id=? OR created_by=?)',
    args: [id, userId, userId],
  });
  return result.rowsAffected > 0;
}
