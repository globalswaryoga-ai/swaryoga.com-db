import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

function parse(value: unknown): any { try { return value ? JSON.parse(String(value)) : {}; } catch { return {}; } }
function now() { return new Date().toISOString(); }
function map(row: any): any {
  const data = parse(row.data_json);
  return {
    ...data,
    _id: String(row.document_id),
    createdByUserId: row.created_by_user_id || data.createdByUserId,
    createdAt: row.created_at || data.createdAt,
    updatedAt: row.updated_at || data.updatedAt,
  };
}

export async function ensureBunnyChatbotSchema() {
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS chatbot_flows_sql (document_id TEXT PRIMARY KEY, created_by_user_id TEXT NOT NULL, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, data_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_chatbot_flows_owner ON chatbot_flows_sql(created_by_user_id, updated_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_chatbot_flows_enabled ON chatbot_flows_sql(enabled, updated_at DESC)', args: [] },
  ]);
}

export async function listBunnyChatbotFlows(ownerId: string, opts: { limit?: number; skip?: number; q?: string } = {}) {
  await ensureBunnyChatbotSchema();
  const limit = Math.min(Math.max(Number(opts.limit || 50), 1), 200);
  const skip = Math.max(Number(opts.skip || 0), 0);
  const clauses = ['created_by_user_id = ?'];
  const args: any[] = [ownerId];
  if (opts.q) { clauses.push('LOWER(name) LIKE ?'); args.push(`%${opts.q.toLowerCase()}%`); }
  const where = clauses.join(' AND ');
  const count = await bunnyExecute({ sql: `SELECT COUNT(*) AS count FROM chatbot_flows_sql WHERE ${where}`, args });
  const rows = await bunnyExecute({ sql: `SELECT * FROM chatbot_flows_sql WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, args: [...args, limit, skip] });
  return { flows: rows.rows.map(map), total: Number(count.rows[0]?.count || 0) };
}

export async function getBunnyChatbotFlow(id: string, ownerId: string) {
  await ensureBunnyChatbotSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM chatbot_flows_sql WHERE document_id = ? AND created_by_user_id = ? LIMIT 1', args: [id, ownerId] });
  return result.rows[0] ? map(result.rows[0]) : null;
}

export async function saveBunnyChatbotFlow(input: Record<string, any>, ownerId: string, id: string = crypto.randomUUID()) {
  await ensureBunnyChatbotSchema();
  const timestamp = now();
  const existing = await getBunnyChatbotFlow(id, ownerId);
  const flow = {
    ...(existing || {}),
    ...input,
    _id: id,
    createdByUserId: ownerId,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await bunnyExecute({
    sql: `INSERT INTO chatbot_flows_sql (document_id,created_by_user_id,name,enabled,data_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(document_id) DO UPDATE SET name=excluded.name,enabled=excluded.enabled,data_json=excluded.data_json,updated_at=excluded.updated_at`,
    args: [id, ownerId, String(flow.name || 'Untitled Flow'), flow.enabled === false ? 0 : 1, JSON.stringify(flow), flow.createdAt, timestamp],
  });
  return getBunnyChatbotFlow(id, ownerId);
}

export async function deleteBunnyChatbotFlow(id: string, ownerId: string) {
  await ensureBunnyChatbotSchema();
  const result = await bunnyExecute({ sql: 'DELETE FROM chatbot_flows_sql WHERE document_id = ? AND created_by_user_id = ?', args: [id, ownerId] });
  return Number((result as any).rowsAffected || (result as any).rows_affected || 0);
}
