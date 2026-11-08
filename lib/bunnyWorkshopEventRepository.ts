import crypto from 'crypto';
import { bunnyBatch, bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';

export interface EventParticipant {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  workshopName?: string;
  amount?: number;
  paymentMode?: string;
  saleId?: string;
  source?: string;
  email?: string;
  city?: string;
  country?: string;
}

export interface WorkshopEventItem {
  _id: string;
  id?: string;
  reportedByUserId: string;
  startDate: string;
  endDate?: string;
  month: string;
  workshopName: string;
  workshopTime?: string;
  workshopFees: number;
  language?: string;
  mode?: string;
  teacher?: string;
  coTeachers?: string[];
  organizers?: string[];
  notes?: string;
  participants: EventParticipant[];
  totalAmount: number;
  participantCount: number;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initWorkshopEventsSchema(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await bunnyExecute(`CREATE TABLE IF NOT EXISTS crm_workshop_events_sql (
      document_id TEXT PRIMARY KEY,
      reported_by_user_id TEXT DEFAULT 'admincrm',
      start_date TEXT NOT NULL,
      end_date TEXT,
      month TEXT NOT NULL,
      workshop_name TEXT NOT NULL,
      workshop_time TEXT DEFAULT '',
      workshop_fees REAL DEFAULT 0,
      language TEXT DEFAULT 'Hindi',
      mode TEXT DEFAULT 'online',
      teacher TEXT DEFAULT '',
      co_teachers_json TEXT DEFAULT '[]',
      organizers_json TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      participant_count INTEGER DEFAULT 0,
      participants_json TEXT NOT NULL DEFAULT '[]',
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    // Ensure columns exist on legacy installations
    await bunnyExecute(`ALTER TABLE crm_workshop_events_sql ADD COLUMN language TEXT DEFAULT ''`).catch(() => {});
    await bunnyExecute(`ALTER TABLE crm_workshop_events_sql ADD COLUMN mode TEXT DEFAULT 'online'`).catch(() => {});
    await bunnyExecute(`ALTER TABLE crm_workshop_events_sql ADD COLUMN teacher TEXT DEFAULT ''`).catch(() => {});
    await bunnyExecute(`ALTER TABLE crm_workshop_events_sql ADD COLUMN co_teachers_json TEXT DEFAULT '[]'`).catch(() => {});
    await bunnyExecute(`ALTER TABLE crm_workshop_events_sql ADD COLUMN organizers_json TEXT DEFAULT '[]'`).catch(() => {});

    await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_cwe_month ON crm_workshop_events_sql(month)`).catch(() => {});
    await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_cwe_workshop ON crm_workshop_events_sql(workshop_name)`).catch(() => {});
    await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_cwe_reported_by ON crm_workshop_events_sql(reported_by_user_id)`).catch(() => {});
    await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_cwe_start_date ON crm_workshop_events_sql(start_date)`).catch(() => {});

    // Check if table is empty, and seed from mongo_documents if available
    try {
      const countRes = await bunnyExecute('SELECT count(*) as count FROM crm_workshop_events_sql');
      const count = Number(countRes.rows[0]?.count || 0);
      if (count === 0) {
        const mongoRows = await bunnyExecute(
          "SELECT document_id, document_json, created_at, updated_at FROM mongo_documents WHERE collection_name = 'crm_workshop_events'"
        );
        if (mongoRows.rows.length > 0) {
          const insertStatements = mongoRows.rows.map((row: any) => {
            const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
            const docId = String(parsed._id || row.document_id);
            const reportedBy = String(parsed.reportedByUserId || 'admincrm');
            const startDate = String(parsed.startDate || row.created_at || new Date().toISOString());
            const endDate = parsed.endDate ? String(parsed.endDate) : null;
            const month = String(parsed.month || startDate.slice(0, 7));
            const workshopName = String(parsed.workshopName || 'Swar Yoga Workshop');
            const workshopTime = String(parsed.workshopTime || '');
            const workshopFees = Number(parsed.workshopFees || 0);
            const language = String(parsed.language || 'Hindi');
            const mode = String(parsed.mode || 'online');
            const teacher = String(parsed.teacher || '');
            const coTeachers = Array.isArray(parsed.coTeachers) ? parsed.coTeachers : [];
            const organizers = Array.isArray(parsed.organizers) ? parsed.organizers : [];
            const notes = String(parsed.notes || '');
            const participants = Array.isArray(parsed.participants) ? parsed.participants : [];
            const totalAmount = Number(parsed.totalAmount || participants.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0));
            const participantCount = Number(parsed.participantCount || participants.length);
            const createdAt = String(parsed.createdAt || row.created_at || new Date().toISOString());
            const updatedAt = String(parsed.updatedAt || row.updated_at || new Date().toISOString());

            return {
              sql: `INSERT OR REPLACE INTO crm_workshop_events_sql (
                document_id, reported_by_user_id, start_date, end_date, month,
                workshop_name, workshop_time, workshop_fees, language, mode, teacher,
                co_teachers_json, organizers_json, notes,
                total_amount, participant_count, participants_json, data_json,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                docId,
                reportedBy,
                startDate,
                endDate,
                month,
                workshopName,
                workshopTime,
                workshopFees,
                language,
                mode,
                teacher,
                JSON.stringify(coTeachers),
                JSON.stringify(organizers),
                notes,
                totalAmount,
                participantCount,
                JSON.stringify(participants),
                JSON.stringify(parsed),
                createdAt,
                updatedAt,
              ],
            };
          });

          // Insert in chunks of 50
          for (let i = 0; i < insertStatements.length; i += 50) {
            await bunnyBatch(insertStatements.slice(i, i + 50));
          }
        }
      }
    } catch (seedErr) {
      console.warn('[WorkshopEvents] Seeding notice:', seedErr);
    }

    isInitialized = true;
  })();

  return initPromise;
}

function parseArrayField(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return String(value).split(',').map((s) => s.trim()).filter(Boolean);
  }
}

function rowToEvent(row: any): WorkshopEventItem {
  let participants: EventParticipant[] = [];
  try {
    participants = JSON.parse(String(row.participants_json || '[]'));
  } catch {
    participants = [];
  }

  let extraData: Record<string, any> = {};
  try {
    extraData = JSON.parse(String(row.data_json || '{}'));
  } catch {
    extraData = {};
  }

  const docId = String(row.document_id);

  const coTeachers = parseArrayField(row.co_teachers_json || extraData.coTeachers);
  const organizers = parseArrayField(row.organizers_json || extraData.organizers);

  return {
    _id: docId,
    id: docId,
    reportedByUserId: String(row.reported_by_user_id || 'admincrm'),
    startDate: String(row.start_date),
    endDate: row.end_date ? String(row.end_date) : undefined,
    month: String(row.month),
    workshopName: String(row.workshop_name),
    workshopTime: String(row.workshop_time || ''),
    workshopFees: Number(row.workshop_fees || 0),
    language: String(row.language || extraData.language || 'Hindi'),
    mode: String(row.mode || extraData.mode || 'online'),
    teacher: String(row.teacher || extraData.teacher || ''),
    coTeachers,
    organizers,
    notes: String(row.notes || ''),
    participants,
    totalAmount: Number(row.total_amount || 0),
    participantCount: Number(row.participant_count || 0),
    labels: Array.isArray(extraData.labels) ? extraData.labels : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getBunnyWorkshopEvents(options: {
  month?: string | null;
  workshop?: string | null;
  limit?: number;
  skip?: number;
  visibleUserIds?: string[] | null;
}): Promise<{
  events: WorkshopEventItem[];
  total: number;
  summary: { totalAmount: number; totalParticipants: number; totalEvents: number };
}> {
  await initWorkshopEventsSchema();

  const whereClauses: string[] = [];
  const args: any[] = [];

  if (options.month) {
    whereClauses.push('month = ?');
    args.push(options.month);
  }

  if (options.workshop) {
    whereClauses.push('workshop_name = ?');
    args.push(options.workshop);
  }

  if (options.visibleUserIds !== undefined && options.visibleUserIds !== null) {
    if (options.visibleUserIds.length === 0) {
      whereClauses.push('1 = 0');
    } else if (options.visibleUserIds.length === 1) {
      whereClauses.push('reported_by_user_id = ?');
      args.push(options.visibleUserIds[0]);
    } else {
      const placeholders = options.visibleUserIds.map(() => '?').join(',');
      whereClauses.push(`reported_by_user_id IN (${placeholders})`);
      args.push(...options.visibleUserIds);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get summary & total count
  const summarySql = `
    SELECT 
      count(*) as total_events,
      coalesce(sum(total_amount), 0) as total_amount,
      coalesce(sum(participant_count), 0) as total_participants
    FROM crm_workshop_events_sql
    ${whereSql}
  `;
  const summaryRes = await bunnyExecute({ sql: summarySql, args });
  const summaryRow = summaryRes.rows[0] || {};
  const total = Number(summaryRow.total_events || 0);
  const summary = {
    totalEvents: total,
    totalAmount: Number(summaryRow.total_amount || 0),
    totalParticipants: Number(summaryRow.total_participants || 0),
  };

  const limit = options.limit !== undefined ? Math.min(Math.max(options.limit, 1), 1000) : 50;
  const skip = options.skip !== undefined ? Math.max(options.skip, 0) : 0;

  const dataSql = `
    SELECT *
    FROM crm_workshop_events_sql
    ${whereSql}
    ORDER BY start_date DESC
    LIMIT ? OFFSET ?
  `;
  const dataArgs = [...args, limit, skip];
  const dataRes = await bunnyExecute({ sql: dataSql, args: dataArgs });
  const events = dataRes.rows.map(rowToEvent);

  return { events, total, summary };
}

export async function getBunnyWorkshopEventById(
  id: string,
  visibleUserIds?: string[] | null
): Promise<WorkshopEventItem | null> {
  await initWorkshopEventsSchema();

  const whereClauses: string[] = ['document_id = ?'];
  const args: any[] = [id];

  if (visibleUserIds !== undefined && visibleUserIds !== null) {
    if (visibleUserIds.length === 1) {
      whereClauses.push('reported_by_user_id = ?');
      args.push(visibleUserIds[0]);
    } else if (visibleUserIds.length > 1) {
      const placeholders = visibleUserIds.map(() => '?').join(',');
      whereClauses.push(`reported_by_user_id IN (${placeholders})`);
      args.push(...visibleUserIds);
    }
  }

  const sql = `SELECT * FROM crm_workshop_events_sql WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
  const res = await bunnyExecute({ sql, args });
  if (res.rows.length === 0) return null;

  return rowToEvent(res.rows[0]);
}

export async function createBunnyWorkshopEvent(data: {
  reportedByUserId: string;
  startDate: string;
  endDate?: string;
  workshopName: string;
  workshopTime?: string;
  workshopFees?: number;
  language?: string;
  mode?: string;
  teacher?: string;
  coTeachers?: string[];
  organizers?: string[];
  notes?: string;
  participants?: EventParticipant[];
  labels?: string[];
}): Promise<WorkshopEventItem> {
  await initWorkshopEventsSchema();

  const docId = crypto.randomUUID();
  const start = new Date(data.startDate);
  const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  const participants = Array.isArray(data.participants) ? data.participants : [];
  const totalAmount = participants.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const participantCount = participants.length;
  const language = data.language || 'Hindi';
  const mode = data.mode || 'online';
  const teacher = data.teacher || '';
  const coTeachers = Array.isArray(data.coTeachers) ? data.coTeachers : [];
  const organizers = Array.isArray(data.organizers) ? data.organizers : [];
  const now = new Date().toISOString();

  const fullData = {
    _id: docId,
    ...data,
    month,
    language,
    mode,
    teacher,
    coTeachers,
    organizers,
    totalAmount,
    participantCount,
    createdAt: now,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `INSERT INTO crm_workshop_events_sql (
      document_id, reported_by_user_id, start_date, end_date, month,
      workshop_name, workshop_time, workshop_fees, language, mode, teacher,
      co_teachers_json, organizers_json, notes,
      total_amount, participant_count, participants_json, data_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      docId,
      data.reportedByUserId || 'admincrm',
      data.startDate,
      data.endDate || null,
      month,
      data.workshopName.trim(),
      data.workshopTime || '',
      Number(data.workshopFees || 0),
      language,
      mode,
      teacher,
      JSON.stringify(coTeachers),
      JSON.stringify(organizers),
      data.notes || '',
      totalAmount,
      participantCount,
      JSON.stringify(participants),
      JSON.stringify(fullData),
      now,
      now,
    ],
  });

  const createdItem: WorkshopEventItem = {
    _id: docId,
    id: docId,
    reportedByUserId: data.reportedByUserId || 'admincrm',
    startDate: data.startDate,
    endDate: data.endDate,
    month,
    workshopName: data.workshopName.trim(),
    workshopTime: data.workshopTime || '',
    workshopFees: Number(data.workshopFees || 0),
    language,
    mode,
    teacher,
    coTeachers,
    organizers,
    notes: data.notes || '',
    participants,
    totalAmount,
    participantCount,
    labels: data.labels || [],
    createdAt: now,
    updatedAt: now,
  };

  return createdItem;
}

export async function updateBunnyWorkshopEvent(
  id: string,
  updates: Partial<WorkshopEventItem>,
  visibleUserIds?: string[] | null
): Promise<WorkshopEventItem | null> {
  await initWorkshopEventsSchema();

  const existing = await getBunnyWorkshopEventById(id, visibleUserIds);
  if (!existing) return null;

  const now = new Date().toISOString();
  let startDate = updates.startDate ?? existing.startDate;
  let month = existing.month;
  if (updates.startDate) {
    const s = new Date(updates.startDate);
    month = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`;
  }

  const endDate = updates.endDate !== undefined ? updates.endDate : existing.endDate;
  const workshopName = updates.workshopName !== undefined ? updates.workshopName.trim() : existing.workshopName;
  const workshopTime = updates.workshopTime !== undefined ? updates.workshopTime : existing.workshopTime;
  const workshopFees = updates.workshopFees !== undefined ? Number(updates.workshopFees) : existing.workshopFees;
  const language = updates.language !== undefined ? updates.language : (existing.language || 'Hindi');
  const mode = updates.mode !== undefined ? updates.mode : (existing.mode || 'online');
  const teacher = updates.teacher !== undefined ? updates.teacher : (existing.teacher || '');
  const coTeachers = updates.coTeachers !== undefined ? updates.coTeachers : (existing.coTeachers || []);
  const organizers = updates.organizers !== undefined ? updates.organizers : (existing.organizers || []);
  const notes = updates.notes !== undefined ? updates.notes : existing.notes;
  const participants = updates.participants !== undefined ? updates.participants : existing.participants;
  const totalAmount = participants.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const participantCount = participants.length;

  const mergedData: WorkshopEventItem = {
    ...existing,
    ...updates,
    startDate,
    endDate,
    workshopName,
    workshopTime,
    workshopFees,
    language,
    mode,
    teacher,
    coTeachers,
    organizers,
    notes,
    participants,
    month,
    totalAmount,
    participantCount,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `UPDATE crm_workshop_events_sql SET
      start_date = ?,
      end_date = ?,
      month = ?,
      workshop_name = ?,
      workshop_time = ?,
      workshop_fees = ?,
      language = ?,
      mode = ?,
      teacher = ?,
      co_teachers_json = ?,
      organizers_json = ?,
      notes = ?,
      total_amount = ?,
      participant_count = ?,
      participants_json = ?,
      data_json = ?,
      updated_at = ?
    WHERE document_id = ?`,
    args: [
      startDate,
      endDate || null,
      month,
      workshopName,
      workshopTime || '',
      workshopFees,
      language,
      mode,
      teacher,
      JSON.stringify(coTeachers),
      JSON.stringify(organizers),
      notes || '',
      totalAmount,
      participantCount,
      JSON.stringify(participants),
      JSON.stringify(mergedData),
      now,
      id,
    ],
  });

  return mergedData;
}

export async function deleteBunnyWorkshopEvent(
  id: string,
  visibleUserIds?: string[] | null
): Promise<boolean> {
  await initWorkshopEventsSchema();

  const existing = await getBunnyWorkshopEventById(id, visibleUserIds);
  if (!existing) return false;

  const whereClauses: string[] = ['document_id = ?'];
  const args: any[] = [id];

  if (visibleUserIds !== undefined && visibleUserIds !== null) {
    if (visibleUserIds.length === 1) {
      whereClauses.push('reported_by_user_id = ?');
      args.push(visibleUserIds[0]);
    } else if (visibleUserIds.length > 1) {
      const placeholders = visibleUserIds.map(() => '?').join(',');
      whereClauses.push(`reported_by_user_id IN (${placeholders})`);
      args.push(...visibleUserIds);
    }
  }

  const sql = `DELETE FROM crm_workshop_events_sql WHERE ${whereClauses.join(' AND ')}`;
  await bunnyExecute({ sql, args });
  return true;
}
