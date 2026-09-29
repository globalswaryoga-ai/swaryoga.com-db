import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

function parse(value: unknown): any { try { return value ? JSON.parse(String(value)) : {}; } catch { return {}; } }
function now() { return new Date().toISOString(); }
function map(row: any): any {
  const data = parse(row.data_json);
  return {
    ...data,
    _id: String(row.document_id),
    leadId: row.lead_id || data.leadId,
    phoneNumber: row.phone_number || data.phoneNumber,
    flowId: row.flow_id || data.flowId,
    actionType: row.action_type || data.actionType,
    status: row.status || data.status,
    executeAt: row.execute_at || data.executeAt,
    createdAt: row.created_at || data.createdAt,
    updatedAt: row.updated_at || data.updatedAt,
  };
}

export async function ensureBunnyChatbotScheduledActionSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS chatbot_scheduled_actions_sql (
        document_id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        flow_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        execute_at TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`, args: []
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_csa_status_exec ON chatbot_scheduled_actions_sql(status, execute_at)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_csa_lead ON chatbot_scheduled_actions_sql(lead_id, status)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_csa_phone ON chatbot_scheduled_actions_sql(phone_number)', args: [] },
  ]);
}

export async function listDueBunnyScheduledActions(opts: { now?: Date; limit?: number } = {}) {
  await ensureBunnyChatbotScheduledActionSchema();
  const cutoff = (opts.now || new Date()).toISOString();
  const limit = Math.min(Math.max(Number(opts.limit || 100), 1), 500);
  const result = await bunnyExecute({
    sql: `SELECT * FROM chatbot_scheduled_actions_sql WHERE status = 'pending' AND execute_at <= ? ORDER BY execute_at ASC LIMIT ?`,
    args: [cutoff, limit],
  });
  return result.rows.map(map);
}

export async function getBunnyScheduledAction(id: string) {
  await ensureBunnyChatbotScheduledActionSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM chatbot_scheduled_actions_sql WHERE document_id = ? LIMIT 1', args: [id] });
  return result.rows[0] ? map(result.rows[0]) : null;
}

export async function createBunnyScheduledAction(input: Record<string, any>) {
  await ensureBunnyChatbotScheduledActionSchema();
  const id = input._id || crypto.randomUUID();
  const timestamp = now();
  const record = {
    ...input,
    _id: id,
    status: input.status || 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await bunnyExecute({
    sql: `INSERT INTO chatbot_scheduled_actions_sql (document_id,lead_id,phone_number,flow_id,action_type,status,execute_at,data_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [
      id,
      String(input.leadId || ''),
      String(input.phoneNumber || ''),
      String(input.flowId || ''),
      String(input.actionType || ''),
      String(input.status || 'pending'),
      typeof input.executeAt === 'string' ? input.executeAt : (input.executeAt instanceof Date ? input.executeAt.toISOString() : timestamp),
      JSON.stringify(record),
      timestamp,
      timestamp,
    ],
  });
  return record;
}

export async function updateBunnyScheduledAction(id: string, updates: Record<string, any>) {
  await ensureBunnyChatbotScheduledActionSchema();
  const existing = await getBunnyScheduledAction(id);
  if (!existing) return null;
  const timestamp = now();
  const merged = { ...existing, ...updates, _id: id, updatedAt: timestamp };
  await bunnyExecute({
    sql: `UPDATE chatbot_scheduled_actions_sql SET status=?, data_json=?, updated_at=? WHERE document_id=?`,
    args: [String(merged.status || 'pending'), JSON.stringify(merged), timestamp, id],
  });
  return merged;
}

export async function cancelBunnyScheduledActionsForLead(leadId: string) {
  await ensureBunnyChatbotScheduledActionSchema();
  const timestamp = now();
  await bunnyExecute({
    sql: `UPDATE chatbot_scheduled_actions_sql SET status='cancelled', updated_at=? WHERE lead_id=? AND status='pending'`,
    args: [timestamp, leadId],
  });
}
