import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
import { uploadToPath, fetchFromStorage, isBunnyStorageConfigured } from '@/lib/bunny-storage';

const STORAGE_PATH = 'admin/crm/chatbot-flows.json';

function parse(value: unknown): any { try { return value ? JSON.parse(String(value)) : {}; } catch { return {}; } }
function now() { return new Date().toISOString(); }

function map(row: any): any {
  const data = parse(row.data_json);
  return {
    ...data,
    _id: String(row.document_id),
    id: String(row.document_id),
    name: row.name || data.name || 'Untitled Flow',
    enabled: row.enabled === undefined ? (data.enabled !== false) : Boolean(row.enabled),
    createdByUserId: row.created_by_user_id || data.createdByUserId,
    createdAt: row.created_at || data.createdAt || now(),
    updatedAt: row.updated_at || data.updatedAt || now(),
  };
}

export async function ensureBunnyChatbotSchema() {
  if (!isBunnyDatabaseConfigured()) return;
  try {
    await bunnyBatch([
      { sql: `CREATE TABLE IF NOT EXISTS chatbot_flows_sql (document_id TEXT PRIMARY KEY, created_by_user_id TEXT NOT NULL, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, data_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`, args: [] },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_chatbot_flows_owner ON chatbot_flows_sql(created_by_user_id, updated_at DESC)', args: [] },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_chatbot_flows_enabled ON chatbot_flows_sql(enabled, updated_at DESC)', args: [] },
    ]);
  } catch (err) {
    console.error('Failed to ensure chatbot flows schema:', err);
  }
}

async function loadStorageFlows(): Promise<any[]> {
  try {
    if (isBunnyStorageConfigured()) {
      const { buffer } = await fetchFromStorage(STORAGE_PATH);
      const data = JSON.parse(buffer.toString('utf-8'));
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}

async function saveStorageFlows(flows: any[]): Promise<void> {
  try {
    if (isBunnyStorageConfigured()) {
      const buffer = Buffer.from(JSON.stringify(flows, null, 2));
      await uploadToPath(buffer, STORAGE_PATH, 'application/json');
    }
  } catch (err) {
    console.error('Failed to save chatbot flows to storage backup:', err);
  }
}

export async function listBunnyChatbotFlows(ownerId?: string, opts: { limit?: number; skip?: number; q?: string } = {}) {
  const limit = Math.min(Math.max(Number(opts.limit || 50), 1), 200);
  const skip = Math.max(Number(opts.skip || 0), 0);

  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyChatbotSchema();
      const clauses: string[] = [];
      const args: any[] = [];

      // Allow admin/admincrm to view all flows created by admin users
      if (ownerId && ownerId !== 'admin' && ownerId !== 'admincrm') {
        clauses.push('(created_by_user_id = ? OR created_by_user_id IN (\'admin\', \'admincrm\'))');
        args.push(ownerId);
      }

      if (opts.q) {
        clauses.push('LOWER(name) LIKE ?');
        args.push(`%${opts.q.toLowerCase()}%`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const countRes = await bunnyExecute({ sql: `SELECT COUNT(*) AS count FROM chatbot_flows_sql ${where}`, args });
      const rowsRes = await bunnyExecute({ sql: `SELECT * FROM chatbot_flows_sql ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, args: [...args, limit, skip] });

      return { flows: rowsRes.rows.map(map), total: Number(countRes.rows[0]?.count || 0) };
    } catch (err) {
      console.error('Bunny SQL list flows error, falling back to storage:', err);
    }
  }

  let list = await loadStorageFlows();
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter(f => (f.name || '').toLowerCase().includes(q));
  }
  const total = list.length;
  const sliced = list.slice(skip, skip + limit);
  return { flows: sliced, total };
}

export async function getBunnyChatbotFlow(id: string, ownerId?: string) {
  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyChatbotSchema();
      const result = await bunnyExecute({ sql: 'SELECT * FROM chatbot_flows_sql WHERE document_id = ? LIMIT 1', args: [id] });
      if (result.rows[0]) return map(result.rows[0]);
    } catch {}
  }

  const list = await loadStorageFlows();
  return list.find(f => f._id === id || f.id === id) || null;
}

export async function saveBunnyChatbotFlow(input: Record<string, any>, ownerId: string, id: string = crypto.randomUUID()) {
  const timestamp = now();
  const existing = await getBunnyChatbotFlow(id, ownerId);

  const flow = {
    ...(existing || {}),
    ...input,
    _id: id,
    id: id,
    createdByUserId: ownerId || existing?.createdByUserId || 'admincrm',
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyChatbotSchema();
      await bunnyExecute({
        sql: `INSERT INTO chatbot_flows_sql (document_id,created_by_user_id,name,enabled,data_json,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?)
          ON CONFLICT(document_id) DO UPDATE SET name=excluded.name,enabled=excluded.enabled,data_json=excluded.data_json,updated_at=excluded.updated_at`,
        args: [id, flow.createdByUserId, String(flow.name || 'Untitled Flow'), flow.enabled === false ? 0 : 1, JSON.stringify(flow), flow.createdAt, timestamp],
      });
    } catch (err) {
      console.error('Failed saving flow to Bunny SQL:', err);
    }
  }

  // Also save to Bunny Edge Storage backup
  const list = await loadStorageFlows();
  const idx = list.findIndex(f => f._id === id || f.id === id);
  if (idx >= 0) list[idx] = flow;
  else list.unshift(flow);
  await saveStorageFlows(list);

  return flow;
}

export async function deleteBunnyChatbotFlow(id: string, ownerId?: string) {
  let count = 0;
  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyChatbotSchema();
      const result = await bunnyExecute({ sql: 'DELETE FROM chatbot_flows_sql WHERE document_id = ?', args: [id] });
      count = Number((result as any).rowsAffected || (result as any).rows_affected || 0);
    } catch {}
  }

  const list = await loadStorageFlows();
  const filtered = list.filter(f => f._id !== id && f.id !== id);
  if (filtered.length !== list.length) {
    count = Math.max(count, 1);
    await saveStorageFlows(filtered);
  }

  return count;
}
