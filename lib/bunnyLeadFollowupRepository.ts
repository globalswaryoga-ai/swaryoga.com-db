import { bunnyExecute } from './bunnyDatabase';

export interface BunnyLeadNote {
  _id: string;
  leadId: string;
  createdByUserId: string;
  note: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BunnyLeadFollowUp {
  _id: string;
  leadId: string;
  createdByUserId: string;
  assignedToUserId?: string;
  title: string;
  description?: string;
  dueAt: string;
  timezone?: string;
  status: 'open' | 'done' | 'cancelled';
  completedAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

let initialized = false;

export async function initLeadFollowupSchema(): Promise<void> {
  if (initialized) return;
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS crm_lead_notes_sql (
      document_id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      created_by_user_id TEXT,
      note TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).catch(() => null);

  await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_crm_lead_notes_lead ON crm_lead_notes_sql(lead_id)`).catch(() => null);

  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS crm_lead_followups_sql (
      document_id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      created_by_user_id TEXT,
      assigned_to_user_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      due_at TEXT,
      timezone TEXT,
      status TEXT NOT NULL,
      completed_at TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).catch(() => null);

  await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_crm_lead_followups_lead ON crm_lead_followups_sql(lead_id)`).catch(() => null);
  await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_crm_lead_followups_due ON crm_lead_followups_sql(due_at)`).catch(() => null);

  initialized = true;
}

export async function createBunnyLeadNote(data: {
  leadId: string;
  createdByUserId: string;
  note: string;
  metadata?: Record<string, any>;
}): Promise<BunnyLeadNote> {
  await initLeadFollowupSchema();
  const docId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT INTO crm_lead_notes_sql (document_id, lead_id, created_by_user_id, note, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      docId,
      data.leadId,
      data.createdByUserId || 'admincrm',
      data.note,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now,
    ],
  });

  return {
    _id: docId,
    leadId: data.leadId,
    createdByUserId: data.createdByUserId,
    note: data.note,
    metadata: data.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listBunnyLeadNotes(leadId: string): Promise<BunnyLeadNote[]> {
  await initLeadFollowupSchema();
  const res = await bunnyExecute({
    sql: `SELECT document_id as _id, lead_id as leadId, created_by_user_id as createdByUserId,
                 note, metadata, created_at as createdAt, updated_at as updatedAt
          FROM crm_lead_notes_sql
          WHERE lead_id = ?
          ORDER BY created_at DESC
          LIMIT 100`,
    args: [leadId],
  }).catch(() => ({ rows: [] }));

  return (res.rows || []).map((row: any) => ({
    _id: String(row._id),
    leadId: String(row.leadId),
    createdByUserId: String(row.createdByUserId || ''),
    note: String(row.note || ''),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }));
}

export async function createBunnyLeadFollowUp(data: {
  leadId: string;
  createdByUserId: string;
  assignedToUserId?: string;
  title: string;
  description?: string;
  dueAt: Date | string;
  timezone?: string;
  status?: 'open' | 'done' | 'cancelled';
  completedAt?: Date | string | null;
  metadata?: Record<string, any>;
}): Promise<BunnyLeadFollowUp> {
  await initLeadFollowupSchema();
  const docId = `flw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const dueAtStr = data.dueAt instanceof Date ? data.dueAt.toISOString() : String(data.dueAt);
  const completedAtStr = data.completedAt instanceof Date ? data.completedAt.toISOString() : data.completedAt || null;

  await bunnyExecute({
    sql: `INSERT INTO crm_lead_followups_sql
          (document_id, lead_id, created_by_user_id, assigned_to_user_id, title, description, due_at, timezone, status, completed_at, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      docId,
      data.leadId,
      data.createdByUserId || 'admincrm',
      data.assignedToUserId || data.createdByUserId || 'admincrm',
      data.title,
      data.description || null,
      dueAtStr,
      data.timezone || 'Asia/Kolkata',
      data.status || 'open',
      completedAtStr,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now,
    ],
  });

  return {
    _id: docId,
    leadId: data.leadId,
    createdByUserId: data.createdByUserId,
    assignedToUserId: data.assignedToUserId,
    title: data.title,
    description: data.description,
    dueAt: dueAtStr,
    timezone: data.timezone,
    status: data.status || 'open',
    completedAt: completedAtStr,
    metadata: data.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listBunnyLeadFollowUps(leadId: string): Promise<BunnyLeadFollowUp[]> {
  await initLeadFollowupSchema();
  const res = await bunnyExecute({
    sql: `SELECT document_id as _id, lead_id as leadId, created_by_user_id as createdByUserId,
                 assigned_to_user_id as assignedToUserId, title, description, due_at as dueAt,
                 timezone, status, completed_at as completedAt, metadata, created_at as createdAt, updated_at as updatedAt
          FROM crm_lead_followups_sql
          WHERE lead_id = ?
          ORDER BY due_at ASC
          LIMIT 100`,
    args: [leadId],
  }).catch(() => ({ rows: [] }));

  return (res.rows || []).map((row: any) => ({
    _id: String(row._id),
    leadId: String(row.leadId),
    createdByUserId: String(row.createdByUserId || ''),
    assignedToUserId: String(row.assignedToUserId || ''),
    title: String(row.title || ''),
    description: String(row.description || ''),
    dueAt: String(row.dueAt || ''),
    timezone: String(row.timezone || ''),
    status: (row.status as any) || 'open',
    completedAt: row.completedAt ? String(row.completedAt) : null,
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }));
}
