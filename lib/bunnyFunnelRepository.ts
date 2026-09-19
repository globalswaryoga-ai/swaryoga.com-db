import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

function parse(value: unknown): any | null {
  try { return JSON.parse(String(value)); } catch { return null; }
}

export async function initBunnyFunnelSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS funnel_config_sql (
        document_id TEXT PRIMARY KEY,
        created_by_user_id TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS funnel_stage_mappings_sql (
        document_id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        funnel_config_id TEXT NOT NULL,
        stage_key TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS funnel_stage_history_sql (
        document_id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_funnel_config_user ON funnel_config_sql(created_by_user_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_funnel_mappings_lead ON funnel_stage_mappings_sql(lead_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_funnel_history_lead ON funnel_stage_history_sql(lead_id)`, args: [] }
  ]);
}

function normalizeDoc(row: any) {
  const doc = parse(row.data_json) || {};
  return {
    ...doc,
    _id: String(doc._id?.$oid || doc._id || row.document_id),
    createdAt: doc.createdAt?.$date ? new Date(Number(doc.createdAt.$date.$numberLong || doc.createdAt.$date)).toISOString() : (doc.createdAt || row.created_at),
    updatedAt: doc.updatedAt?.$date ? new Date(Number(doc.updatedAt.$date.$numberLong || doc.updatedAt.$date)).toISOString() : (doc.updatedAt || row.updated_at)
  };
}

export async function getBunnyFunnelConfig(userId: string, isSuperAdmin: boolean) {
  await initBunnyFunnelSchema();
  const query = isSuperAdmin ? 'SELECT * FROM funnel_config_sql LIMIT 1' : 'SELECT * FROM funnel_config_sql WHERE created_by_user_id = ? LIMIT 1';
  const args = isSuperAdmin ? [] : [userId];
  const result = await bunnyExecute({ sql: query, args });
  if (!result.rows[0]) return null;
  return normalizeDoc(result.rows[0]);
}

export async function createBunnyFunnelConfig(input: any) {
  await initBunnyFunnelSchema();
  const id = input._id || crypto.randomUUID();
  const now = new Date().toISOString();
  const data = { ...input, _id: id, createdAt: now, updatedAt: now };

  await bunnyExecute({
    sql: `INSERT INTO funnel_config_sql (document_id, created_by_user_id, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, String(input.createdByUserId || ''), JSON.stringify(data), now, now]
  });
  return data;
}

export async function updateBunnyFunnelConfig(id: string, updates: any) {
  await initBunnyFunnelSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM funnel_config_sql WHERE document_id = ?', args: [id] });
  if (!result.rows[0]) return null;
  const existing = normalizeDoc(result.rows[0]);
  const now = new Date().toISOString();
  const updatedData = { ...existing, ...updates, updatedAt: now };

  await bunnyExecute({
    sql: `UPDATE funnel_config_sql SET data_json = ?, updated_at = ? WHERE document_id = ?`,
    args: [JSON.stringify(updatedData), now, id]
  });
  return updatedData;
}

export async function getBunnyFunnelStageMappings(leadIds: string[]) {
  if (!leadIds.length) return [];
  await initBunnyFunnelSchema();
  const placeholders = leadIds.map(() => '?').join(',');
  const result = await bunnyExecute({
    sql: `SELECT * FROM funnel_stage_mappings_sql WHERE lead_id IN (${placeholders})`,
    args: leadIds
  });
  return result.rows.map(normalizeDoc);
}

export async function upsertBunnyFunnelStageMapping(leadId: string, funnelConfigId: string, mappingData: any) {
  await initBunnyFunnelSchema();
  const result = await bunnyExecute({
    sql: `SELECT * FROM funnel_stage_mappings_sql WHERE lead_id = ? AND funnel_config_id = ?`,
    args: [leadId, funnelConfigId]
  });
  
  const now = new Date().toISOString();
  let id = crypto.randomUUID();
  let dataToSave = { ...mappingData, leadId, funnelConfigId, _id: id, createdAt: now, updatedAt: now };
  
  if (result.rows[0]) {
    const existing = normalizeDoc(result.rows[0]);
    id = existing._id;
    dataToSave = { ...existing, ...mappingData, updatedAt: now };
    await bunnyExecute({
      sql: `UPDATE funnel_stage_mappings_sql SET stage_key = ?, data_json = ?, updated_at = ? WHERE document_id = ?`,
      args: [String(mappingData.stageKey || ''), JSON.stringify(dataToSave), now, id]
    });
  } else {
    await bunnyExecute({
      sql: `INSERT INTO funnel_stage_mappings_sql (document_id, lead_id, funnel_config_id, stage_key, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, leadId, funnelConfigId, String(mappingData.stageKey || ''), JSON.stringify(dataToSave), now, now]
    });
  }
  return dataToSave;
}

export async function createBunnyFunnelStageHistory(input: any) {
  await initBunnyFunnelSchema();
  const id = input._id || crypto.randomUUID();
  const now = new Date().toISOString();
  const data = { ...input, _id: id, createdAt: now, updatedAt: now };

  await bunnyExecute({
    sql: `INSERT INTO funnel_stage_history_sql (document_id, lead_id, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, String(input.leadId || ''), JSON.stringify(data), now, now]
  });
  return data;
}
