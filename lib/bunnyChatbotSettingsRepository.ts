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

export async function ensureBunnyChatbotSettingsSchema() {
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS chatbot_settings_sql (document_id TEXT PRIMARY KEY, created_by_user_id TEXT NOT NULL UNIQUE, data_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_chatbot_settings_owner ON chatbot_settings_sql(created_by_user_id)', args: [] },
  ]);
}

export async function getBunnyChatbotSettings(ownerId: string) {
  await ensureBunnyChatbotSettingsSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM chatbot_settings_sql WHERE created_by_user_id = ? LIMIT 1', args: [ownerId] });
  return result.rows[0] ? map(result.rows[0]) : null;
}

export async function saveBunnyChatbotSettings(input: Record<string, any>, ownerId: string) {
  await ensureBunnyChatbotSettingsSchema();
  const timestamp = now();
  const existing = await getBunnyChatbotSettings(ownerId);
  const id = existing?._id || crypto.randomUUID();
  const settings = {
    ...(existing || {}),
    ...input,
    _id: id,
    createdByUserId: ownerId,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await bunnyExecute({
    sql: `INSERT INTO chatbot_settings_sql (document_id,created_by_user_id,data_json,created_at,updated_at)
      VALUES (?,?,?,?,?)
      ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`,
    args: [id, ownerId, JSON.stringify(settings), settings.createdAt, timestamp],
  });
  return getBunnyChatbotSettings(ownerId);
}
