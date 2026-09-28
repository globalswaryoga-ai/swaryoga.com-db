/**
 * BunnyDB repository for broadcast runs and messages.
 * Drop-in replacement for MongoDB BroadcastRun / BroadcastRunMessage models.
 */
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';

let schemaInitialised = false;
export async function ensureBroadcastSchema() {
  if (schemaInitialised) return;
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS broadcast_runs_sql (
        document_id TEXT PRIMARY KEY,
        broadcast_run_key TEXT,
        name TEXT,
        created_by_user_id TEXT,
        created_by_label TEXT,
        mode TEXT,
        provider TEXT,
        status TEXT,
        template_id TEXT,
        scheduled_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT,
        updated_at TEXT,
        migrated_at TEXT
      )`,
      args: [],
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_status ON broadcast_runs_sql(status, scheduled_at)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_owner ON broadcast_runs_sql(created_by_user_id)`, args: [] },
    {
      sql: `CREATE TABLE IF NOT EXISTS broadcast_run_messages_sql (
        document_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        lead_id TEXT,
        phone_number TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        wa_message_id TEXT,
        failure_reason TEXT,
        sent_at TEXT,
        delivered_at TEXT,
        read_at TEXT,
        updated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_brm_run_id ON broadcast_run_messages_sql(run_id, status)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_brm_phone ON broadcast_run_messages_sql(phone_number)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_brm_wa_msg ON broadcast_run_messages_sql(wa_message_id)`, args: [] },
  ]);
  schemaInitialised = true;
}

function parse(v: unknown): any {
  try { return v ? JSON.parse(String(v)) : {}; } catch { return {}; }
}
function nowIso() { return new Date().toISOString(); }

function cleanStats(raw: any): any {
  if (!raw) return { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0, delivered: 0, read: 0, blocked: 0 };
  const n = (v: any) => {
    if (typeof v === 'number') return v;
    if (v && typeof v === 'object' && '$numberInt' in v) return Number(v.$numberInt);
    if (v && typeof v === 'object' && '$numberLong' in v) return Number(v.$numberLong);
    return Number(v) || 0;
  };
  return { total: n(raw.total), pending: n(raw.pending), sent: n(raw.sent), failed: n(raw.failed), skipped: n(raw.skipped), delivered: n(raw.delivered || 0), read: n(raw.read || 0), blocked: n(raw.blocked || 0) };
}

function rowToRun(row: any): any {
  const d = parse(row.data_json);
  return {
    _id: row.document_id,
    name: row.name,
    createdByUserId: row.created_by_user_id,
    createdByLabel: row.created_by_label,
    mode: row.mode,
    provider: row.provider,
    status: row.status,
    templateId: row.template_id,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    templateSnapshot: d.templateSnapshot || null,
    messageInterval: d.messageInterval || null,
    target: d.target || null,
    stats: cleanStats(d.stats),
    lastError: d.lastError || null,
  };
}

function rowToMessage(row: any): any {
  return {
    _id: row.document_id,
    runId: row.run_id,
    leadId: row.lead_id,
    phoneNumber: row.phone_number,
    status: row.status,
    waMessageId: row.wa_message_id || null,
    failureReason: row.failure_reason || null,
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

// ─── BroadcastRun ─────────────────────────────────────────────────────────────

export async function broadcastRunFind(filter: {
  status?: string | string[];
  scheduledAtLte?: Date;
}, opts: { limit?: number } = {}): Promise<any[]> {
  await ensureBroadcastSchema();
  const parts: string[] = ['1=1'];
  const args: any[] = [];
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      parts.push(`status IN (${filter.status.map(() => '?').join(',')})`);
      args.push(...filter.status);
    } else { parts.push('status = ?'); args.push(filter.status); }
  }
  if (filter.scheduledAtLte) {
    parts.push(`(scheduled_at IS NULL OR scheduled_at <= ?)`);
    args.push(filter.scheduledAtLte.toISOString());
  }
  const limitClause = opts.limit ? `LIMIT ${opts.limit}` : '';
  const result = await bunnyExecute({ sql: `SELECT * FROM broadcast_runs_sql WHERE ${parts.join(' AND ')} ORDER BY COALESCE(scheduled_at, created_at) ASC ${limitClause}`, args });
  return result.rows.map(rowToRun);
}

export async function broadcastRunFindOne(runId: string): Promise<any | null> {
  await ensureBroadcastSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM broadcast_runs_sql WHERE document_id = ?', args: [runId] });
  const row = result.rows[0];
  return row ? rowToRun(row) : null;
}

export async function broadcastRunCreate(doc: any): Promise<any> {
  await ensureBroadcastSchema();
  const id = doc._id || crypto.randomUUID();
  const n = nowIso();
  const dataJson = JSON.stringify({ templateSnapshot: doc.templateSnapshot || null, messageInterval: doc.messageInterval || null, target: doc.target || null, stats: doc.stats || { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0 }, lastError: null });
  await bunnyExecute({ sql: `INSERT INTO broadcast_runs_sql (document_id, name, created_by_user_id, created_by_label, mode, provider, status, template_id, scheduled_at, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [id, doc.name || '', doc.createdByUserId || '', doc.createdByLabel || '', doc.mode || 'now', doc.provider || 'meta', doc.status || 'draft', doc.templateId || '', doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : null, dataJson, n, n] });
  return { ...doc, _id: id, createdAt: new Date(n), updatedAt: new Date(n) };
}

export async function broadcastRunUpdateOne(runId: string, update: { status?: string; startedAt?: Date; completedAt?: Date; scheduledAt?: Date; lastError?: string; stats?: any }) {
  await ensureBroadcastSchema();
  const n = nowIso();
  const existing = await broadcastRunFindOne(runId);
  const existingData = existing ? { templateSnapshot: existing.templateSnapshot, messageInterval: existing.messageInterval, target: existing.target, stats: existing.stats, lastError: existing.lastError } : {};
  const newData = { ...existingData, ...(update.stats ? { stats: update.stats } : {}), ...(update.lastError !== undefined ? { lastError: update.lastError } : {}) };
  const setParts: string[] = ['updated_at = ?', 'data_json = ?'];
  const args: any[] = [n, JSON.stringify(newData)];
  if (update.status !== undefined) { setParts.push('status = ?'); args.push(update.status); }
  if (update.startedAt) { setParts.push('started_at = ?'); args.push(update.startedAt.toISOString()); }
  if (update.completedAt) { setParts.push('completed_at = ?'); args.push(update.completedAt.toISOString()); }
  if (update.scheduledAt) { setParts.push('scheduled_at = ?'); args.push(update.scheduledAt.toISOString()); }
  args.push(runId);
  await bunnyExecute({ sql: `UPDATE broadcast_runs_sql SET ${setParts.join(', ')} WHERE document_id = ?`, args });
}

// ─── BroadcastRunMessage ──────────────────────────────────────────────────────

export async function broadcastRunMessageInsertMany(docs: any[]) {
  await ensureBroadcastSchema();
  if (!docs.length) return;
  const n = nowIso();
  const statements = docs.map(doc => ({ sql: `INSERT OR IGNORE INTO broadcast_run_messages_sql (document_id, run_id, lead_id, phone_number, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`, args: [doc._id || crypto.randomUUID(), String(doc.runId), doc.leadId ? String(doc.leadId) : null, String(doc.phoneNumber), n, n] }));
  await bunnyBatch(statements);
}

export async function broadcastRunMessageFind(filter: { runId: string; status?: string | string[] }, opts: { limit?: number } = {}): Promise<any[]> {
  await ensureBroadcastSchema();
  const parts = ['run_id = ?'];
  const args: any[] = [filter.runId];
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      parts.push(`status IN (${filter.status.map(() => '?').join(',')})`);
      args.push(...filter.status);
    } else {
      parts.push('status = ?');
      args.push(filter.status);
    }
  }
  const limitClause = opts.limit ? `LIMIT ${opts.limit}` : '';
  const result = await bunnyExecute({ sql: `SELECT * FROM broadcast_run_messages_sql WHERE ${parts.join(' AND ')} ${limitClause}`, args });
  return result.rows.map(rowToMessage);
}

export async function broadcastRunMessageUpdateOne(messageId: string, update: { status?: string; waMessageId?: string; failureReason?: string; sentAt?: Date; deliveredAt?: Date; readAt?: Date }) {
  await ensureBroadcastSchema();
  const n = nowIso();
  const setParts: string[] = ['updated_at = ?'];
  const args: any[] = [n];
  if (update.status !== undefined) { setParts.push('status = ?'); args.push(update.status); }
  if (update.waMessageId !== undefined) { setParts.push('wa_message_id = ?'); args.push(update.waMessageId); }
  if (update.failureReason !== undefined) { setParts.push('failure_reason = ?'); args.push(update.failureReason); }
  if (update.sentAt) { setParts.push('sent_at = ?'); args.push(update.sentAt.toISOString()); }
  if (update.deliveredAt) { setParts.push('delivered_at = ?'); args.push(update.deliveredAt.toISOString()); }
  if (update.readAt) { setParts.push('read_at = ?'); args.push(update.readAt.toISOString()); }
  args.push(messageId);
  const result = await bunnyExecute({ sql: `UPDATE broadcast_run_messages_sql SET ${setParts.join(', ')} WHERE document_id = ?`, args });
  return Number((result as any).rowsAffected || (result as any).rows_affected || 0) > 0;
}

export async function broadcastRunMessageUpdateMany(filter: { runId: string; status?: string | string[]; updatedAtLt?: Date }, update: { status: string; failureReason?: string }) {
  await ensureBroadcastSchema();
  const n = nowIso();
  const whereParts = ['run_id = ?'];
  const whereArgs: any[] = [filter.runId];
  if (filter.status) {
    if (Array.isArray(filter.status)) { whereParts.push(`status IN (${filter.status.map(() => '?').join(',')})`); whereArgs.push(...filter.status); }
    else { whereParts.push('status = ?'); whereArgs.push(filter.status); }
  }
  if (filter.updatedAtLt) { whereParts.push('updated_at < ?'); whereArgs.push(filter.updatedAtLt.toISOString()); }
  const setParts = ['status = ?', 'updated_at = ?'];
  const setArgs: any[] = [update.status, n];
  if (update.failureReason) { setParts.push('failure_reason = ?'); setArgs.push(update.failureReason); }
  await bunnyExecute({ sql: `UPDATE broadcast_run_messages_sql SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}`, args: [...setArgs, ...whereArgs] });
}

export async function broadcastRunMessageCountDocuments(filter: { runId: string; status?: string | string[] }): Promise<number> {
  await ensureBroadcastSchema();
  const parts = ['run_id = ?'];
  const args: any[] = [filter.runId];
  if (filter.status) {
    if (Array.isArray(filter.status)) { parts.push(`status IN (${filter.status.map(() => '?').join(',')})`); args.push(...filter.status); }
    else { parts.push('status = ?'); args.push(filter.status); }
  }
  const result = await bunnyExecute({ sql: `SELECT COUNT(*) as count FROM broadcast_run_messages_sql WHERE ${parts.join(' AND ')}`, args });
  return Number(result.rows[0]?.count ?? 0);
}

export async function markRunStatsBunny(runId: string) {
  await ensureBroadcastSchema();
  const result = await bunnyExecute({ sql: `SELECT status, COUNT(*) as count FROM broadcast_run_messages_sql WHERE run_id = ? GROUP BY status`, args: [runId] });
  const map = new Map<string, number>();
  result.rows.forEach((r: any) => map.set(String(r.status).toLowerCase(), Number(r.count)));
  const pendingRaw = map.get('pending') || 0;
  const sendingRaw = map.get('sending') || 0;
  const sentRaw = map.get('sent') || 0;
  const deliveredRaw = map.get('delivered') || 0;
  const readRaw = map.get('read') || 0;
  const failed = map.get('failed') || 0;
  const skipped = map.get('skipped') || 0;
  const blocked = map.get('blocked') || 0;
  const read = readRaw;
  const delivered = deliveredRaw + readRaw;
  const sent = sentRaw + deliveredRaw + readRaw;
  const pending = pendingRaw + sendingRaw;
  const total = pending + sent + failed + skipped + blocked;
  await broadcastRunUpdateOne(runId, { stats: { total, pending, sent, delivered, read, failed, skipped, blocked } });
  return { total, pending, sent, delivered, read, failed, skipped, blocked };
}

// ─── Lead helpers ─────────────────────────────────────────────────────────────

export async function getLeadsByIds(ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = await bunnyExecute({ sql: `SELECT document_id, data_json FROM leads_sql WHERE document_id IN (${placeholders})`, args: ids });
  return result.rows.map((r: any) => ({ ...parse(r.data_json), _id: r.document_id }));
}

export async function getLeadsByPhones(phones: string[]): Promise<any[]> {
  if (!phones.length) return [];
  const parts: string[] = [];
  const args: any[] = [];
  phones.forEach(p => { parts.push("json_extract(data_json,'$.phoneNumber') LIKE ?"); args.push(`%${p.slice(-10)}`); });
  const result = await bunnyExecute({ sql: `SELECT document_id, data_json FROM leads_sql WHERE ${parts.join(' OR ')}`, args });
  return result.rows.map((r: any) => ({ ...parse(r.data_json), _id: r.document_id }));
}

// ─── Template helper ──────────────────────────────────────────────────────────

export async function getTemplateById(templateId: string): Promise<any | null> {
  const result = await bunnyExecute({ sql: 'SELECT data_json FROM whatsapp_templates_sql WHERE document_id = ? LIMIT 1', args: [templateId] });
  const row = result.rows[0];
  if (!row) return null;
  return { ...parse(row.data_json), _id: templateId };
}

// ─── CRMUserSettings ──────────────────────────────────────────────────────────

export async function getCrmUserSettings(userId: string): Promise<any | null> {
  const result = await bunnyExecute({ sql: `SELECT data_json FROM crm_user_settings_sql WHERE created_by_user_id = ? LIMIT 1`, args: [userId] });
  const row = result.rows[0];
  return row ? parse(row.data_json) : null;
}

// ─── List runs (for GET /broadcast-runs API) ──────────────────────────────────

export async function listBroadcastRuns(filter: { status?: string; provider?: string; createdByUserId?: string; isSuperAdmin?: boolean }, opts: { limit?: number; skip?: number } = {}): Promise<{ runs: any[]; total: number }> {
  await ensureBroadcastSchema();
  const parts: string[] = ['1=1'];
  const args: any[] = [];
  if (filter.status) { parts.push('status = ?'); args.push(filter.status); }
  if (filter.provider) { parts.push('provider = ?'); args.push(filter.provider); }
  if (!filter.isSuperAdmin && filter.createdByUserId) { parts.push('created_by_user_id = ?'); args.push(filter.createdByUserId); }
  const where = parts.join(' AND ');
  const countResult = await bunnyExecute({ sql: `SELECT COUNT(*) as count FROM broadcast_runs_sql WHERE ${where}`, args });
  const total = Number(countResult.rows[0]?.count ?? 0);
  const limit = opts.limit ?? 25;
  const skip = opts.skip ?? 0;
  const rowsResult = await bunnyExecute({ sql: `SELECT * FROM broadcast_runs_sql WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${skip}`, args });
  return { runs: rowsResult.rows.map(rowToRun), total };
}
