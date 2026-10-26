import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';

export async function initGroupMergeSchedulerSchema(): Promise<void> {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS group_merge_schedules_sql (
        document_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tenant_id TEXT,
        name TEXT NOT NULL,
        target_group_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_group_merge_sched_user ON group_merge_schedules_sql(user_id, status)`,
      args: [],
    },
  ]);
}

export async function listGroupMergeSchedules(userId?: string): Promise<any[]> {
  await initGroupMergeSchedulerSchema();
  const sql = userId
    ? `SELECT * FROM group_merge_schedules_sql WHERE user_id = ? AND status != 'archived' ORDER BY created_at DESC`
    : `SELECT * FROM group_merge_schedules_sql WHERE status != 'archived' ORDER BY created_at DESC`;
  const args = userId ? [userId] : [];

  const res = await bunnyExecute({ sql, args });
  return res.rows.map((r: any) => {
    try {
      const data = JSON.parse(r.data_json);
      return { _id: r.document_id, ...data, id: r.document_id };
    } catch {
      return { _id: r.document_id, id: r.document_id, name: r.name, status: r.status };
    }
  });
}

export async function getGroupMergeScheduleById(id: string): Promise<any | null> {
  await initGroupMergeSchedulerSchema();
  const res = await bunnyExecute({
    sql: `SELECT * FROM group_merge_schedules_sql WHERE document_id = ? LIMIT 1`,
    args: [id],
  });
  if (!res.rows[0]) return null;
  const r: any = res.rows[0];
  try {
    const data = JSON.parse(r.data_json);
    return { _id: r.document_id, ...data, id: r.document_id };
  } catch {
    return { _id: r.document_id, id: r.document_id, name: r.name, status: r.status };
  }
}

export async function createGroupMergeSchedule(data: any): Promise<any> {
  await initGroupMergeSchedulerSchema();
  const documentId = data._id || data.id || `gms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const record = {
    ...data,
    _id: documentId,
    id: documentId,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `INSERT INTO group_merge_schedules_sql (
      document_id, user_id, tenant_id, name, target_group_id, status, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      documentId,
      String(data.userId || 'admincrm'),
      data.tenantId ? String(data.tenantId) : null,
      String(data.name || 'Group Merge Schedule'),
      String(data.targetGroupId || ''),
      String(data.status || 'active'),
      JSON.stringify(record),
      now,
      now,
    ],
  });

  return record;
}

export async function updateGroupMergeSchedule(id: string, updates: any): Promise<any | null> {
  await initGroupMergeSchedulerSchema();
  const existing = await getGroupMergeScheduleById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated = {
    ...existing,
    ...updates,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `UPDATE group_merge_schedules_sql SET
      name = ?,
      target_group_id = ?,
      status = ?,
      data_json = ?,
      updated_at = ?
      WHERE document_id = ?`,
    args: [
      String(updated.name || existing.name),
      String(updated.targetGroupId || existing.targetGroupId),
      String(updated.status || existing.status),
      JSON.stringify(updated),
      now,
      id,
    ],
  });

  return updated;
}

export async function deleteGroupMergeSchedule(id: string): Promise<boolean> {
  await initGroupMergeSchedulerSchema();
  const res = await bunnyExecute({
    sql: `DELETE FROM group_merge_schedules_sql WHERE document_id = ?`,
    args: [id],
  });
  return Boolean(res.rowsAffected && res.rowsAffected > 0);
}
