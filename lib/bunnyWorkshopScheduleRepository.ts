import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';

export type BunnyWorkshopSchedule = {
  id: string;
  _id?: string;
  workshopSlug: string;
  workshopName?: string;
  mode: string;
  language?: string;
  batch?: string;
  startDate?: string | null;
  endDate?: string | null;
  days?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  seatsTotal: number;
  seatsRemaining: number;
  registrationCloseDate?: string | null;
  location?: string;
  price: number;
  price3Month: number;
  priceNPR: number;
  nepalQrCode?: string;
  currency: string;
  status: 'draft' | 'published';
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

export type BunnyWorkshopCatalogItem = {
  id: string;
  _id: string;
  slug: string;
  name: string;
  category: string;
  modes: string[];
  languages: string[];
  duration?: string;
  isPublished: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (value: unknown, fallback: unknown) => JSON.stringify(value ?? fallback);
const parse = <T>(value: unknown, fallback: T): T => {
  try {
    return value ? (JSON.parse(String(value)) as T) : fallback;
  } catch {
    return fallback;
  }
};

function parseMongoDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (val.$date) {
      if (typeof val.$date === 'string') return val.$date;
      if (val.$date.$numberLong) return new Date(Number(val.$date.$numberLong)).toISOString();
      return new Date(Number(val.$date)).toISOString();
    }
  }
  return null;
}

function parseMongoNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'object' && val.$numberInt) return Number(val.$numberInt) || fallback;
  if (typeof val === 'object' && val.$numberDouble) return Number(val.$numberDouble) || fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function scheduleRowToObj(row: any): BunnyWorkshopSchedule {
  return {
    id: String(row.id),
    _id: String(row.id),
    workshopSlug: row.workshop_slug,
    workshopName: row.workshop_name || '',
    mode: row.mode,
    language: row.language || 'Hindi',
    batch: row.batch || 'morning',
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    days: row.days || '',
    time: row.time || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    seatsTotal: Number(row.seats_total || 60),
    seatsRemaining: Number(row.seats_remaining ?? row.seats_total ?? 60),
    registrationCloseDate: row.registration_close_date || null,
    location: row.location || '',
    price: Number(row.price || 0),
    price3Month: Number(row.price_3_month || 0),
    priceNPR: Number(row.price_npr || 0),
    nepalQrCode: row.nepal_qr_code || '',
    currency: row.currency || 'INR',
    status: (row.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
    publishedAt: row.published_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: parse(row.metadata_json, {}),
  };
}

function catalogRowToObj(row: any): BunnyWorkshopCatalogItem {
  return {
    id: String(row.slug),
    _id: String(row.slug),
    slug: row.slug,
    name: row.name,
    category: row.category,
    modes: parse(row.modes_json, ['online']),
    languages: parse(row.languages_json, ['Hindi']),
    duration: row.duration || '',
    isPublished: Boolean(row.is_published),
    metadata: {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

let scheduleSchemaPromise: Promise<void> | undefined;

export function initWorkshopScheduleSchema() {
  if (!scheduleSchemaPromise) {
    scheduleSchemaPromise = initializeWorkshopScheduleSchema().catch((err) => {
      scheduleSchemaPromise = undefined;
      throw err;
    });
  }
  return scheduleSchemaPromise;
}

async function initializeWorkshopScheduleSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS workshop_schedules_sql (
        id TEXT PRIMARY KEY,
        workshop_slug TEXT NOT NULL,
        workshop_name TEXT,
        mode TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'Hindi',
        batch TEXT NOT NULL DEFAULT 'morning',
        start_date TEXT,
        end_date TEXT,
        days TEXT,
        time TEXT,
        start_time TEXT,
        end_time TEXT,
        seats_total INTEGER NOT NULL DEFAULT 60,
        seats_remaining INTEGER NOT NULL DEFAULT 60,
        registration_close_date TEXT,
        location TEXT,
        price REAL NOT NULL DEFAULT 0,
        price_3_month REAL NOT NULL DEFAULT 0,
        price_npr REAL NOT NULL DEFAULT 0,
        nepal_qr_code TEXT,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL DEFAULT 'draft',
        published_at TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_workshop_schedules_slug ON workshop_schedules_sql(workshop_slug)',
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_workshop_schedules_status ON workshop_schedules_sql(status)',
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_workshop_schedules_mode ON workshop_schedules_sql(mode)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS workshop_catalog_sql (
        slug TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        modes_json TEXT NOT NULL DEFAULT '["online"]',
        languages_json TEXT NOT NULL DEFAULT '["Hindi"]',
        duration TEXT,
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS workshop_seat_inventory_sql (
        schedule_id TEXT PRIMARY KEY,
        workshop_slug TEXT NOT NULL,
        seats_total INTEGER NOT NULL DEFAULT 60,
        seats_remaining INTEGER NOT NULL DEFAULT 60,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
  ]);

  // Seed workshop_schedules_sql from mongo_documents if empty
  const countSchedules = await bunnyExecute('SELECT COUNT(*) as cnt FROM workshop_schedules_sql');
  if (Number(countSchedules.rows[0]?.cnt || 0) === 0) {
    try {
      const archivedSchedules = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'workshopschedules'"
      );
      for (const row of archivedSchedules.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const schedId = String(doc._id || row.document_id);
          const startDate = parseMongoDate(doc.startDate);
          const endDate = parseMongoDate(doc.endDate);
          const regClose = parseMongoDate(doc.registrationCloseDate);
          const pubAt = parseMongoDate(doc.publishedAt);
          const createdAt = parseMongoDate(doc.createdAt) || now();
          const updatedAt = parseMongoDate(doc.updatedAt) || now();
          const seatsTotal = parseMongoNumber(doc.seatsTotal, 60);

          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO workshop_schedules_sql (
              id, workshop_slug, workshop_name, mode, language, batch,
              start_date, end_date, days, time, start_time, end_time,
              seats_total, seats_remaining, registration_close_date, location,
              price, price_3_month, price_npr, nepal_qr_code, currency,
              status, published_at, metadata_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              schedId,
              String(doc.workshopSlug || ''),
              String(doc.workshopName || ''),
              String(doc.mode || 'online').toLowerCase(),
              String(doc.language || 'Hindi'),
              String(doc.batch || 'morning'),
              startDate,
              endDate,
              String(doc.days || ''),
              String(doc.time || ''),
              String(doc.startTime || ''),
              String(doc.endTime || ''),
              seatsTotal,
              seatsTotal,
              regClose,
              String(doc.location || ''),
              parseMongoNumber(doc.price, 0),
              parseMongoNumber(doc.price3Month, 0),
              parseMongoNumber(doc.priceNPR, 0),
              String(doc.nepalQrCode || ''),
              String(doc.currency || 'INR'),
              doc.status === 'published' ? 'published' : 'draft',
              pubAt,
              '{}',
              createdAt,
              updatedAt,
            ],
          });

          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO workshop_seat_inventory_sql (
              schedule_id, workshop_slug, seats_total, seats_remaining, updated_at
            ) VALUES (?, ?, ?, ?, ?)`,
            args: [schedId, String(doc.workshopSlug || ''), seatsTotal, seatsTotal, updatedAt],
          });
        } catch (itemErr) {
          console.error('[Seed workshop_schedules_sql] Error migrating item:', itemErr);
        }
      }
    } catch (archiveErr) {
      console.warn('[Seed workshop_schedules_sql] mongo_documents read skipped:', archiveErr);
    }
  }

  // Seed workshop_catalog_sql from mongo_documents if empty
  const countCatalog = await bunnyExecute('SELECT COUNT(*) as cnt FROM workshop_catalog_sql');
  if (Number(countCatalog.rows[0]?.cnt || 0) === 0) {
    try {
      const archivedCatalog = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'workshops'"
      );
      for (const row of archivedCatalog.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const slug = String(doc.slug || row.document_id).trim();
          if (!slug) continue;
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO workshop_catalog_sql (
              slug, name, category, modes_json, languages_json, duration, is_published, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              slug,
              String(doc.name || slug),
              String(doc.category || 'General'),
              json(doc.modes, ['online']),
              json(doc.languages, ['Hindi']),
              String(doc.duration || ''),
              doc.isPublished !== false ? 1 : 0,
              parseMongoDate(doc.createdAt) || now(),
              parseMongoDate(doc.updatedAt) || now(),
            ],
          });
        } catch (catErr) {
          console.error('[Seed workshop_catalog_sql] Error migrating item:', catErr);
        }
      }
    } catch (archiveErr) {
      console.warn('[Seed workshop_catalog_sql] mongo_documents read skipped:', archiveErr);
    }
  }
}

export async function listWorkshopSchedules(filters: {
  workshopSlug?: string;
  mode?: string;
  status?: string;
  language?: string;
} = {}): Promise<BunnyWorkshopSchedule[]> {
  await initWorkshopScheduleSchema();
  const conditions: string[] = [];
  const args: any[] = [];

  if (filters.workshopSlug) {
    conditions.push('workshop_slug = ?');
    args.push(filters.workshopSlug);
  }
  if (filters.mode) {
    conditions.push('LOWER(mode) = ?');
    args.push(filters.mode.toLowerCase());
  }
  if (filters.status) {
    conditions.push('status = ?');
    args.push(filters.status.toLowerCase());
  }
  if (filters.language) {
    conditions.push('LOWER(language) = ?');
    args.push(filters.language.toLowerCase());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM workshop_schedules_sql ${where} ORDER BY workshop_slug ASC, start_date ASC`;
  const result = await bunnyExecute({ sql, args });
  return result.rows.map(scheduleRowToObj);
}

export async function getWorkshopSchedule(id: string): Promise<BunnyWorkshopSchedule | null> {
  await initWorkshopScheduleSchema();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM workshop_schedules_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  return result.rows[0] ? scheduleRowToObj(result.rows[0]) : null;
}

export async function saveWorkshopSchedule(
  data: Partial<BunnyWorkshopSchedule> & {
    id?: string;
    workshopSlug: string;
    mode: string;
  }
): Promise<BunnyWorkshopSchedule> {
  await initWorkshopScheduleSchema();
  const scheduleId = String(data.id || id());
  const timestamp = now();
  const seatsTotal = Number(data.seatsTotal ?? 60);
  const seatsRemaining = Number(data.seatsRemaining ?? seatsTotal);

  await bunnyExecute({
    sql: `INSERT INTO workshop_schedules_sql (
      id, workshop_slug, workshop_name, mode, language, batch,
      start_date, end_date, days, time, start_time, end_time,
      seats_total, seats_remaining, registration_close_date, location,
      price, price_3_month, price_npr, nepal_qr_code, currency,
      status, published_at, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      workshop_slug = excluded.workshop_slug,
      workshop_name = excluded.workshop_name,
      mode = excluded.mode,
      language = excluded.language,
      batch = excluded.batch,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      days = excluded.days,
      time = excluded.time,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      seats_total = excluded.seats_total,
      registration_close_date = excluded.registration_close_date,
      location = excluded.location,
      price = excluded.price,
      price_3_month = excluded.price_3_month,
      price_npr = excluded.price_npr,
      nepal_qr_code = excluded.nepal_qr_code,
      currency = excluded.currency,
      status = excluded.status,
      published_at = excluded.published_at,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at`,
    args: [
      scheduleId,
      String(data.workshopSlug),
      data.workshopName || '',
      String(data.mode).toLowerCase(),
      data.language || 'Hindi',
      data.batch || 'morning',
      data.startDate || null,
      data.endDate || null,
      data.days || '',
      data.time || '',
      data.startTime || '',
      data.endTime || '',
      seatsTotal,
      seatsRemaining,
      data.registrationCloseDate || null,
      data.location || '',
      Number(data.price || 0),
      Number(data.price3Month || 0),
      Number(data.priceNPR || 0),
      data.nepalQrCode || '',
      data.currency || 'INR',
      data.status === 'published' ? 'published' : 'draft',
      data.status === 'published' ? data.publishedAt || timestamp : null,
      json(data.metadata, {}),
      timestamp,
      timestamp,
    ],
  });

  await bunnyExecute({
    sql: `INSERT INTO workshop_seat_inventory_sql (
      schedule_id, workshop_slug, seats_total, seats_remaining, updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(schedule_id) DO UPDATE SET
      workshop_slug = excluded.workshop_slug,
      seats_total = excluded.seats_total,
      updated_at = excluded.updated_at`,
    args: [scheduleId, String(data.workshopSlug), seatsTotal, seatsRemaining, timestamp],
  });

  const created = await getWorkshopSchedule(scheduleId);
  if (!created) throw new Error('Failed to retrieve saved workshop schedule');
  return created;
}

export async function updateWorkshopSchedule(
  id: string,
  updates: Record<string, any>
): Promise<BunnyWorkshopSchedule | null> {
  await initWorkshopScheduleSchema();
  const existing = await getWorkshopSchedule(id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const args: any[] = [];
  const timestamp = now();

  const columnMapping: Record<string, string> = {
    workshopSlug: 'workshop_slug',
    workshopName: 'workshop_name',
    mode: 'mode',
    language: 'language',
    batch: 'batch',
    startDate: 'start_date',
    endDate: 'end_date',
    days: 'days',
    time: 'time',
    startTime: 'start_time',
    endTime: 'end_time',
    seatsTotal: 'seats_total',
    seatsRemaining: 'seats_remaining',
    registrationCloseDate: 'registration_close_date',
    location: 'location',
    price: 'price',
    price3Month: 'price_3_month',
    priceNPR: 'price_npr',
    nepalQrCode: 'nepal_qr_code',
    currency: 'currency',
    status: 'status',
    publishedAt: 'published_at',
  };

  for (const [key, col] of Object.entries(columnMapping)) {
    if (key in updates) {
      let val = updates[key];
      if (key === 'mode') val = String(val || '').toLowerCase();
      if (key === 'status') {
        val = String(val || '').toLowerCase() === 'published' ? 'published' : 'draft';
        if (val === 'published' && !updates.publishedAt) {
          setClauses.push('published_at = ?');
          args.push(timestamp);
        }
      }
      setClauses.push(`${col} = ?`);
      args.push(val);
    }
  }

  if (updates.metadata) {
    setClauses.push('metadata_json = ?');
    args.push(json(updates.metadata, {}));
  }

  setClauses.push('updated_at = ?');
  args.push(timestamp);

  args.push(id);
  await bunnyExecute({
    sql: `UPDATE workshop_schedules_sql SET ${setClauses.join(', ')} WHERE id = ?`,
    args,
  });

  if (updates.seatsTotal !== undefined) {
    await bunnyExecute({
      sql: `UPDATE workshop_seat_inventory_sql SET seats_total = ?, updated_at = ? WHERE schedule_id = ?`,
      args: [Number(updates.seatsTotal), timestamp, id],
    });
  }

  return getWorkshopSchedule(id);
}

export async function deleteWorkshopSchedule(id: string): Promise<boolean> {
  await initWorkshopScheduleSchema();
  const res = await bunnyExecute({
    sql: 'DELETE FROM workshop_schedules_sql WHERE id = ?',
    args: [id],
  });
  await bunnyExecute({
    sql: 'DELETE FROM workshop_seat_inventory_sql WHERE schedule_id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// Workshop Catalog (Workshop Types)
export async function listWorkshopCatalog(): Promise<BunnyWorkshopCatalogItem[]> {
  await initWorkshopScheduleSchema();
  const res = await bunnyExecute(
    'SELECT * FROM workshop_catalog_sql ORDER BY category ASC, name ASC'
  );
  return res.rows.map(catalogRowToObj);
}

export async function getWorkshopCatalogItem(slug: string): Promise<BunnyWorkshopCatalogItem | null> {
  await initWorkshopScheduleSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM workshop_catalog_sql WHERE slug = ? LIMIT 1',
    args: [slug],
  });
  return res.rows[0] ? catalogRowToObj(res.rows[0]) : null;
}

export async function getWorkshopCatalogItemByIdOrSlug(idOrSlug: string): Promise<BunnyWorkshopCatalogItem | null> {
  await initWorkshopScheduleSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM workshop_catalog_sql WHERE id = ? OR slug = ? LIMIT 1',
    args: [idOrSlug, idOrSlug],
  });
  return res.rows[0] ? catalogRowToObj(res.rows[0]) : null;
}


export async function saveWorkshopCatalogItem(data: {
  slug: string;
  name: string;
  category: string;
  modes?: string[];
  languages?: string[];
  duration?: string;
  isPublished?: boolean;
}): Promise<BunnyWorkshopCatalogItem> {
  await initWorkshopScheduleSchema();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO workshop_catalog_sql (
      slug, name, category, modes_json, languages_json, duration, is_published, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      modes_json = excluded.modes_json,
      languages_json = excluded.languages_json,
      duration = excluded.duration,
      is_published = excluded.is_published,
      updated_at = excluded.updated_at`,
    args: [
      data.slug.trim(),
      data.name.trim(),
      data.category.trim(),
      json(data.modes, ['online']),
      json(data.languages, ['Hindi']),
      data.duration?.trim() || '',
      data.isPublished !== false ? 1 : 0,
      timestamp,
      timestamp,
    ],
  });
  const item = await getWorkshopCatalogItem(data.slug);
  if (!item) throw new Error('Failed to retrieve saved workshop catalog item');
  return item;
}

// Seat Inventory Availability
export async function getWorkshopAvailabilityMap(
  requests: Array<{ workshopSlug: string; scheduleId: string; seatsTotal?: number }>
): Promise<Record<string, number>> {
  await initWorkshopScheduleSchema();
  const result: Record<string, number> = {};

  for (const r of requests) {
    const key = `${r.workshopSlug}|${r.scheduleId}`;
    const row = await bunnyExecute({
      sql: 'SELECT seats_remaining FROM workshop_seat_inventory_sql WHERE schedule_id = ? LIMIT 1',
      args: [r.scheduleId],
    });

    if (row.rows[0]) {
      result[key] = Number(row.rows[0].seats_remaining ?? 60);
    } else {
      const seats = Number(r.seatsTotal || 60);
      result[key] = seats;
      await bunnyExecute({
        sql: `INSERT OR IGNORE INTO workshop_seat_inventory_sql (
          schedule_id, workshop_slug, seats_total, seats_remaining, updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
        args: [r.scheduleId, r.workshopSlug, seats, seats, now()],
      });
    }
  }

  return result;
}

export async function getAllWorkshopSeatInventory() {
  await initWorkshopScheduleSchema();
  const res = await bunnyExecute(
    'SELECT schedule_id, workshop_slug, seats_total, seats_remaining FROM workshop_seat_inventory_sql'
  );
  return res.rows.map((r: any) => ({
    scheduleId: r.schedule_id,
    workshopSlug: r.workshop_slug,
    seatsTotal: Number(r.seats_total || 60),
    seatsRemaining: Number(r.seats_remaining ?? r.seats_total ?? 60),
  }));
}

// ============================================
// Workshop Batches & Videos & Recordings (BunnyDB)
// ============================================

export async function initWorkshopBatchesSchema(): Promise<void> {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS workshop_batches_sql (
        id TEXT PRIMARY KEY,
        workshop_id TEXT NOT NULL,
        batch_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        enrolled_users_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_workshop_batches_ws ON workshop_batches_sql(workshop_id)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS workshop_videos_sql (
        id TEXT PRIMARY KEY,
        workshop_id TEXT NOT NULL,
        batch_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        s3_key TEXT,
        bunny_video_id TEXT,
        thumbnail TEXT,
        duration INTEGER,
        day_number INTEGER NOT NULL DEFAULT 1,
        access_type TEXT NOT NULL DEFAULT 'enrolled',
        recorded_date TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        view_count INTEGER NOT NULL DEFAULT 0,
        unique_viewers INTEGER NOT NULL DEFAULT 0,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_workshop_videos_ws ON workshop_videos_sql(workshop_id, batch_id)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS workshop_recordings_sql (
        id TEXT PRIMARY KEY,
        workshop_id TEXT NOT NULL,
        topic TEXT,
        start_time TEXT,
        duration INTEGER,
        synced_at TEXT,
        gallery_view_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
  ]);
}

export async function listWorkshopBatches(workshopId: string) {
  await initWorkshopBatchesSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM workshop_batches_sql WHERE workshop_id = ? ORDER BY batch_number DESC',
    args: [workshopId],
  });
  return Promise.all(
    res.rows.map(async (row: any) => {
      const vCountRes = await bunnyExecute({
        sql: 'SELECT COUNT(*) as cnt FROM workshop_videos_sql WHERE batch_id = ? AND is_active = 1',
        args: [String(row.id)],
      });
      return {
        _id: String(row.id),
        id: String(row.id),
        workshopId: String(row.workshop_id),
        batchNumber: Number(row.batch_number),
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        isActive: Boolean(row.is_active),
        videoCount: Number(vCountRes.rows[0]?.cnt || 0),
        enrolledUsers: parse(row.enrolled_users_json, []),
      };
    })
  );
}

export async function createWorkshopBatch(data: {
  workshopId: string;
  batchNumber: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}) {
  await initWorkshopBatchesSchema();
  const existing = await bunnyExecute({
    sql: 'SELECT id FROM workshop_batches_sql WHERE workshop_id = ? AND batch_number = ? LIMIT 1',
    args: [data.workshopId, data.batchNumber],
  });
  if (existing.rows[0]) {
    throw new Error('Batch number already exists for this workshop');
  }

  const batchId = id();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO workshop_batches_sql (
      id, workshop_id, batch_number, name, start_date, end_date, is_active,
      enrolled_users_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
    args: [
      batchId,
      data.workshopId,
      data.batchNumber,
      data.name || `Batch ${data.batchNumber}`,
      data.startDate || null,
      data.endDate || null,
      data.isActive !== false ? 1 : 0,
      timestamp,
      timestamp,
    ],
  });

  const res = await bunnyExecute({
    sql: 'SELECT * FROM workshop_batches_sql WHERE id = ? LIMIT 1',
    args: [batchId],
  });
  const row = res.rows[0];
  return {
    _id: String(row.id),
    id: String(row.id),
    workshopId: String(row.workshop_id),
    batchNumber: Number(row.batch_number),
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: Boolean(row.is_active),
    videoCount: 0,
    enrolledUsers: [],
  };
}

export async function updateWorkshopBatch(batchId: string, updates: Record<string, any>) {
  await initWorkshopBatchesSchema();
  const sets: string[] = [];
  const args: any[] = [];

  if (updates.name !== undefined) {
    sets.push('name = ?');
    args.push(updates.name);
  }
  if (updates.startDate !== undefined) {
    sets.push('start_date = ?');
    args.push(updates.startDate || null);
  }
  if (updates.endDate !== undefined) {
    sets.push('end_date = ?');
    args.push(updates.endDate || null);
  }
  if (updates.isActive !== undefined) {
    sets.push('is_active = ?');
    args.push(updates.isActive ? 1 : 0);
  }
  if (updates.enrolledUsers !== undefined) {
    sets.push('enrolled_users_json = ?');
    args.push(json(updates.enrolledUsers, []));
  }

  if (sets.length > 0) {
    sets.push('updated_at = ?');
    args.push(now());
    args.push(batchId);
    await bunnyExecute({
      sql: `UPDATE workshop_batches_sql SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });
  }

  const res = await bunnyExecute({
    sql: 'SELECT * FROM workshop_batches_sql WHERE id = ? LIMIT 1',
    args: [batchId],
  });
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    _id: String(row.id),
    id: String(row.id),
    workshopId: String(row.workshop_id),
    batchNumber: Number(row.batch_number),
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: Boolean(row.is_active),
    enrolledUsers: parse(row.enrolled_users_json, []),
  };
}

export async function deleteWorkshopBatch(batchId: string) {
  await initWorkshopBatchesSchema();
  await bunnyExecute({
    sql: 'UPDATE workshop_batches_sql SET is_active = 0, updated_at = ? WHERE id = ?',
    args: [now(), batchId],
  });
}

// Workshop Videos
export async function listWorkshopVideos(workshopId: string, batchId?: string) {
  await initWorkshopBatchesSchema();
  const sql = batchId
    ? 'SELECT * FROM workshop_videos_sql WHERE workshop_id = ? AND batch_id = ? AND is_active = 1 ORDER BY day_number ASC'
    : 'SELECT * FROM workshop_videos_sql WHERE workshop_id = ? AND is_active = 1 ORDER BY day_number ASC';
  const args = batchId ? [workshopId, batchId] : [workshopId];
  const res = await bunnyExecute({ sql, args });
  return res.rows.map((row: any) => ({
    _id: String(row.id),
    id: String(row.id),
    workshopId: String(row.workshop_id),
    batchId: row.batch_id ? String(row.batch_id) : undefined,
    title: row.title,
    description: row.description,
    s3Key: row.s3_key,
    bunnyVideoId: row.bunny_video_id,
    thumbnail: row.thumbnail,
    duration: row.duration,
    dayNumber: Number(row.day_number || 1),
    accessType: row.access_type || 'enrolled',
    recordedDate: row.recorded_date,
    isActive: Boolean(row.is_active),
    viewCount: Number(row.view_count || 0),
    uniqueViewers: Number(row.unique_viewers || 0),
  }));
}

export async function saveWorkshopVideo(data: Record<string, any>) {
  await initWorkshopBatchesSchema();
  const videoId = data.id || id();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO workshop_videos_sql (
      id, workshop_id, batch_id, title, description, s3_key, bunny_video_id,
      thumbnail, duration, day_number, access_type, recorded_date, is_active,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      s3_key = excluded.s3_key,
      bunny_video_id = excluded.bunny_video_id,
      thumbnail = excluded.thumbnail,
      duration = excluded.duration,
      day_number = excluded.day_number,
      access_type = excluded.access_type,
      recorded_date = excluded.recorded_date,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at`,
    args: [
      videoId,
      String(data.workshopId),
      data.batchId ? String(data.batchId) : null,
      data.title || 'Video',
      data.description || '',
      data.s3Key || '',
      data.bunnyVideoId || null,
      data.thumbnail || null,
      Number(data.duration || 0),
      Number(data.dayNumber || 1),
      data.accessType || 'enrolled',
      data.recordedDate || timestamp.split('T')[0],
      data.isActive !== false ? 1 : 0,
      timestamp,
      timestamp,
    ],
  });
  return { _id: videoId, id: videoId, ...data };
}

export async function deleteWorkshopVideo(videoId: string) {
  await initWorkshopBatchesSchema();
  await bunnyExecute({
    sql: 'UPDATE workshop_videos_sql SET is_active = 0, updated_at = ? WHERE id = ?',
    args: [now(), videoId],
  });
}

// Workshop Recordings
export async function listWorkshopRecordings(workshopId: string) {
  await initWorkshopBatchesSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM workshop_recordings_sql WHERE workshop_id = ? ORDER BY start_time DESC',
    args: [workshopId],
  });
  return res.rows.map((row: any) => ({
    _id: String(row.id),
    id: String(row.id),
    workshopId: String(row.workshop_id),
    topic: row.topic,
    startTime: row.start_time,
    duration: Number(row.duration || 0),
    syncedAt: row.synced_at,
    galleryView: parse(row.gallery_view_json, null),
  }));
}

