import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';

export async function initGroupMergeSchema(): Promise<void> {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS merge_group_v2_queue_sql (
        document_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_key TEXT NOT NULL,
        target_group_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        next_operation_time TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_group_merge_user ON merge_group_v2_queue_sql(user_id, status)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_group_merge_status_time ON merge_group_v2_queue_sql(status, next_operation_time)`,
      args: [],
    },
  ]);
}

export async function createMergeJobBunny(entry: any): Promise<string> {
  await initGroupMergeSchema();
  const id = `mgj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const record = {
    ...entry,
    _id: id,
    id,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  const nextOpTime = entry.nextOperationTime instanceof Date
    ? entry.nextOperationTime.toISOString()
    : String(entry.nextOperationTime || now);

  await bunnyExecute({
    sql: `INSERT INTO merge_group_v2_queue_sql (
      document_id, user_id, session_key, target_group_id, operation_type, status, next_operation_time, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      String(entry.userId || 'admincrm'),
      String(entry.sessionKey || ''),
      String(entry.targetGroupId || ''),
      String(entry.operationType || 'add'),
      String(entry.status || 'pending'),
      nextOpTime,
      JSON.stringify(record),
      now,
      now,
    ],
  });

  return id;
}

export async function listMergeJobsBunny(userId?: string): Promise<any[]> {
  await initGroupMergeSchema();
  const sql = userId
    ? `SELECT * FROM merge_group_v2_queue_sql WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
    : `SELECT * FROM merge_group_v2_queue_sql ORDER BY created_at DESC LIMIT 100`;
  const args = userId ? [userId] : [];

  const res = await bunnyExecute({ sql, args });
  return res.rows.map((r: any) => {
    try {
      const data = JSON.parse(r.data_json);
      return { _id: r.document_id, ...data, id: r.document_id };
    } catch {
      return { _id: r.document_id, id: r.document_id, status: r.status };
    }
  });
}

export async function getMergeJobByIdBunny(id: string): Promise<any | null> {
  await initGroupMergeSchema();
  const res = await bunnyExecute({
    sql: `SELECT * FROM merge_group_v2_queue_sql WHERE document_id = ? LIMIT 1`,
    args: [id],
  });
  if (!res.rows[0]) return null;
  const r: any = res.rows[0];
  try {
    const data = JSON.parse(r.data_json);
    return {
      _id: r.document_id,
      ...data,
      id: r.document_id,
      nextOperationTime: data.nextOperationTime ? new Date(data.nextOperationTime) : new Date(),
      lastOperationTime: data.lastOperationTime ? new Date(data.lastOperationTime) : new Date(),
    };
  } catch {
    return { _id: r.document_id, id: r.document_id, status: r.status };
  }
}

export async function updateMergeJobBunny(id: string, updates: any): Promise<any | null> {
  await initGroupMergeSchema();
  const existing = await getMergeJobByIdBunny(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated = {
    ...existing,
    ...updates,
    updatedAt: now,
  };

  const nextOpTime = updated.nextOperationTime instanceof Date
    ? updated.nextOperationTime.toISOString()
    : updated.nextOperationTime || now;

  await bunnyExecute({
    sql: `UPDATE merge_group_v2_queue_sql SET
      status = ?,
      next_operation_time = ?,
      data_json = ?,
      updated_at = ?
      WHERE document_id = ?`,
    args: [
      String(updated.status || existing.status),
      nextOpTime,
      JSON.stringify(updated),
      now,
      id,
    ],
  });

  return updated;
}
