import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

function parse<T = Record<string, any>>(value: unknown, fallback: T): T {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
}
function stringValue(value: unknown): string { return String(value ?? ''); }
function iso(value: unknown): string | null { return value ? new Date(value as any).toISOString() : null; }

export async function initBunnyMetaWhatsAppSchema() {
  await bunnyBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS meta_messages_sql (document_id TEXT PRIMARY KEY,lead_id TEXT,phone_number TEXT NOT NULL DEFAULT \'\',provider TEXT NOT NULL DEFAULT \'meta\',direction TEXT NOT NULL DEFAULT \'outbound\',message_type TEXT NOT NULL DEFAULT \'text\',status TEXT NOT NULL DEFAULT \'queued\',wa_message_id TEXT,sender_number TEXT,sent_at TEXT,created_at TEXT,updated_at TEXT,data_json TEXT NOT NULL)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_phone_time ON meta_messages_sql(phone_number,sent_at DESC,created_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_lead_time ON meta_messages_sql(lead_id,sent_at DESC,created_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_provider ON meta_messages_sql(provider,sent_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_wa_id ON meta_messages_sql(wa_message_id)', args: [] },
  ]);
}

export async function upsertBunnyMetaMessage(message: Record<string, any>) {
  await initBunnyMetaWhatsAppSchema();
  const row: Record<string, any> = { ...message };
  const documentId = stringValue(row._id || row.documentId || row.waMessageId);
  if (!documentId || !row.phoneNumber) throw new Error('Meta message identity is incomplete');
  row.documentId = documentId;
  row.provider = 'meta';
  await bunnyExecute({
    sql: `INSERT INTO meta_messages_sql (document_id,lead_id,phone_number,provider,direction,message_type,status,wa_message_id,sender_number,sent_at,created_at,updated_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET lead_id=excluded.lead_id,phone_number=excluded.phone_number,direction=excluded.direction,message_type=excluded.message_type,status=excluded.status,wa_message_id=excluded.wa_message_id,sender_number=excluded.sender_number,sent_at=excluded.sent_at,updated_at=excluded.updated_at,data_json=excluded.data_json`,
    args: [documentId, row.leadId ? stringValue(row.leadId) : null, stringValue(row.phoneNumber), 'meta', stringValue(row.direction || 'outbound'), stringValue(row.messageType || 'text'), stringValue(row.status || 'queued'), row.waMessageId ? stringValue(row.waMessageId) : null, row.senderNumber ? stringValue(row.senderNumber) : null, iso(row.sentAt), iso(row.createdAt), iso(row.updatedAt) || new Date().toISOString(), JSON.stringify(row)],
  });
  return row;
}

export async function listBunnyMetaMessages(input: { phoneNumber?: string; leadId?: string; limit?: number; skip?: number; before?: string }) {
  await initBunnyMetaWhatsAppSchema();
  const clauses = ["provider = 'meta'"];
  const args: (string | number)[] = [];
  if (input.phoneNumber) { clauses.push('phone_number = ?'); args.push(input.phoneNumber); }
  if (input.leadId) { clauses.push('lead_id = ?'); args.push(input.leadId); }
  if (input.before) { clauses.push('(sent_at < ? OR (sent_at IS NULL AND created_at < ?))'); args.push(input.before, input.before); }
  const limit = Math.min(Math.max(Number(input.limit || 100), 1), 500);
  const skip = Math.max(Number(input.skip || 0), 0);
  args.push(limit, skip);
  const result = await bunnyExecute({ sql: `SELECT data_json FROM meta_messages_sql WHERE ${clauses.join(' AND ')} ORDER BY COALESCE(sent_at,created_at) DESC LIMIT ? OFFSET ?`, args });
  return result.rows.map((row) => parse(row.data_json, {}));
}

export async function countBunnyMetaMessages(input: { phoneNumber?: string; leadId?: string }) {
  await initBunnyMetaWhatsAppSchema();
  const clauses = ["provider = 'meta'"]; const args: string[] = [];
  if (input.phoneNumber) { clauses.push('phone_number = ?'); args.push(input.phoneNumber); }
  if (input.leadId) { clauses.push('lead_id = ?'); args.push(input.leadId); }
  const result = await bunnyExecute({ sql: `SELECT COUNT(*) AS count FROM meta_messages_sql WHERE ${clauses.join(' AND ')}`, args });
  return Number(result.rows[0]?.count || 0);
}
