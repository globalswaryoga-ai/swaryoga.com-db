import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

function map(row: Record<string, unknown>): Record<string, any> {
  const data = JSON.parse(String(row.data_json));
  return { ...data, _id: String(row.document_id), id: String(row.document_id),
    name: String(row.name), enabled: Boolean(row.enabled), createdByUserId: String(row.created_by_user_id),
    createdAt: row.created_at, updatedAt: row.updated_at };
}
function ownerClause(owner?: string) {
  return owner && !['admin', 'admincrm'].includes(owner)
    ? { sql: ' AND created_by_user_id=?', args: [owner] } : { sql: '', args: [] };
}
export async function ensureBunnyChatbotSchema() {
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS chatbot_flows_sql (document_id TEXT PRIMARY KEY, created_by_user_id TEXT NOT NULL, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, data_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_chatbot_flows_owner ON chatbot_flows_sql(created_by_user_id, updated_at DESC)', args: [] },
  ]);
}
export async function listBunnyChatbotFlows(ownerId?: string, opts: { limit?: number; skip?: number; q?: string } = {}) {
  await ensureBunnyChatbotSchema();
  const owner = ownerClause(ownerId);
  const search = opts.q ? ' AND LOWER(name) LIKE ?' : '';
  const args = [...owner.args, ...(opts.q ? [`%${opts.q.toLowerCase()}%`] : [])];
  const where = `WHERE 1=1${owner.sql}${search}`;
  const limit = Math.min(Math.max(Number(opts.limit || 50), 1), 200);
  const skip = Math.max(Number(opts.skip || 0), 0);
  const count = await bunnyExecute({ sql: `SELECT COUNT(*) AS total FROM chatbot_flows_sql ${where}`, args });
  const rows = await bunnyExecute({ sql: `SELECT * FROM chatbot_flows_sql ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, args: [...args, limit, skip] });
  return { flows: rows.rows.map(map), total: Number(count.rows[0]?.total || 0) };
}
export async function getBunnyChatbotFlow(id: string, ownerId?: string) {
  await ensureBunnyChatbotSchema();
  const owner = ownerClause(ownerId);
  const rows = await bunnyExecute({ sql: `SELECT * FROM chatbot_flows_sql WHERE document_id=?${owner.sql} LIMIT 1`, args: [id, ...owner.args] });
  return rows.rows[0] ? map(rows.rows[0]) : null;
}
export async function saveBunnyChatbotFlow(input: Record<string, any>, ownerId: string, id: string = crypto.randomUUID()) {
  await ensureBunnyChatbotSchema();
  const existing = await getBunnyChatbotFlow(id);
  if (existing && ownerClause(ownerId).sql && existing.createdByUserId !== ownerId)
    throw new Error('This chatbot flow belongs to another account.');
  const timestamp = new Date().toISOString();
  const flow = { ...existing, ...input, _id: id, id,
    enabled: input.enabled ?? existing?.enabled ?? true,
    createdByUserId: existing?.createdByUserId || ownerId,
    createdAt: existing?.createdAt || timestamp, updatedAt: timestamp };
  const result = await bunnyExecute({
    sql: `INSERT INTO chatbot_flows_sql(document_id,created_by_user_id,name,enabled,data_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET
      name=excluded.name,enabled=excluded.enabled,data_json=excluded.data_json,updated_at=excluded.updated_at
      WHERE chatbot_flows_sql.created_by_user_id=excluded.created_by_user_id`,
    args: [id, flow.createdByUserId, String(input.name || existing?.name || 'Untitled Flow'), flow.enabled === false ? 0 : 1, JSON.stringify(flow), flow.createdAt, timestamp],
  });
  if (!result.rowsAffected) throw new Error('Chatbot save conflict; reload before saving.');
  return getBunnyChatbotFlow(id, ownerId);
}
export async function deleteBunnyChatbotFlow(id: string, ownerId?: string) {
  await ensureBunnyChatbotSchema();
  const owner = ownerClause(ownerId);
  const result = await bunnyExecute({ sql: `DELETE FROM chatbot_flows_sql WHERE document_id=?${owner.sql}`, args: [id, ...owner.args] });
  return Number(result.rowsAffected);
}
