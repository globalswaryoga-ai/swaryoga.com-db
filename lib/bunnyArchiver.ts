/**
 * Bunny DB Archiver
 * ==================
 * Moves aged rows from Bunny DB (SQLite, ~1 GB limit) to Bunny Storage (unlimited).
 *
 * Strategy: "Hot / Cold" data lifecycle
 *  - HOT  (< KEEP_DAYS days old) → stays in Bunny DB for fast reads
 *  - COLD (>= KEEP_DAYS days old) → archived to Bunny Storage as gzipped JSON
 *
 * An archive manifest record is kept in meta_archive_manifest_sql so the
 * inbox list can still show archived conversations without reading every blob.
 *
 * Archive blob path in Bunny Storage:
 *   archives/meta-messages/{dateKey}/{phoneNumber}.json.gz
 *   archives/form-submissions/{dateKey}/batch.json.gz
 *   archives/leads/{dateKey}/batch.json.gz
 */

import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { uploadToPath, fetchFromStorage, getPublicFileUrl } from '@/lib/bunny-storage';
import crypto from 'node:crypto';
import { promisify } from 'util';
import { gzip as _gzip, gunzip as _gunzip } from 'zlib';

const gzip = promisify(_gzip);
const gunzip = promisify(_gunzip);

/** How many days to keep rows hot in the DB before archiving */
const KEEP_DAYS = parseInt(process.env.ARCHIVE_KEEP_DAYS || '2', 10);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function uploadGzippedJson(path: string, rows: any[]): Promise<number> {
  const json = Buffer.from(JSON.stringify(rows), 'utf8');
  const compressed = await gzip(json);
  await uploadToPath(compressed, path, 'application/gzip');
  return compressed.length;
}

/** Read and decompress a blob from Bunny Storage */
export async function readArchivedBlob(bunnyPath: string): Promise<any[]> {
  try {
    const { buffer } = await fetchFromStorage(bunnyPath);
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString('utf8'));
  } catch {
    return [];
  }
}

// ─── Ensure archive tables ─────────────────────────────────────────────────────

let archiveSchemaReady = false;

async function ensureArchiveSchema() {
  if (archiveSchemaReady) return;
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS archive_log (
        id          TEXT PRIMARY KEY,
        table_name  TEXT NOT NULL,
        date_key    TEXT NOT NULL,
        bunny_path  TEXT NOT NULL,
        row_count   INTEGER NOT NULL DEFAULT 0,
        byte_size   INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'done'
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_archive_log_table_date
            ON archive_log(table_name, date_key)`,
      args: [],
    },
  ]);
  archiveSchemaReady = true;
}

// ─── Meta Messages Archiver ───────────────────────────────────────────────────

/**
 * Archive WhatsApp Meta messages older than KEEP_DAYS days.
 * Groups by phone_number + date_key so each blob = 1 conversation day.
 * Returns total rows archived.
 */
export async function archiveOldMetaMessages(): Promise<{ archived: number; freed: number }> {
  await ensureArchiveSchema();

  const cutoff = daysAgo(KEEP_DAYS);

  // Fetch rows to archive (oldest first)
  const result = await bunnyExecute({
    sql: `SELECT document_id, phone_number, sent_at, created_at, data_json
          FROM meta_messages_sql
          WHERE provider = 'meta'
            AND COALESCE(sent_at, created_at) < ?
          ORDER BY COALESCE(sent_at, created_at) ASC`,
    args: [cutoff],
  });

  if (result.rows.length === 0) return { archived: 0, freed: 0 };

  // Group by phone_number + date
  const groups = new Map<string, { phone: string; day: string; rows: any[] }>();
  for (const row of result.rows) {
    const phone = String(row.phone_number);
    const rawDate = row.sent_at || row.created_at;
    const day = rawDate ? String(rawDate).slice(0, 10) : dateKey(new Date());
    const key = `${phone}|${day}`;
    if (!groups.has(key)) groups.set(key, { phone, day, rows: [] });
    groups.get(key)!.rows.push(JSON.parse(String(row.data_json)));
  }

  let totalArchived = 0;
  let totalFreed = 0;
  const idsToDelete: string[] = [];

  for (const { phone, day, rows } of groups.values()) {
    const blobPath = `archives/meta-messages/${day}/${phone}.json.gz`;
    try {
      const byteSize = await uploadGzippedJson(blobPath, rows);

      // Upsert into meta_archive_manifest_sql so conversations list still works
      await bunnyExecute({
        sql: `INSERT INTO meta_archive_manifest_sql
                (document_id, tenant_user_id, phone_number, date_key, bunny_path, byte_size, message_count, archived_at, data_json)
              VALUES (?, '', ?, ?, ?, ?, ?, ?, '{}')
              ON CONFLICT(tenant_user_id, phone_number, date_key) DO UPDATE SET
                byte_size = excluded.byte_size,
                message_count = excluded.message_count,
                bunny_path = excluded.bunny_path,
                archived_at = excluded.archived_at`,
        args: [
          crypto.randomUUID(),
          phone,
          day,
          blobPath,
          byteSize,
          rows.length,
          new Date().toISOString(),
        ],
      });

      // Log it
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO archive_log
              (id, table_name, date_key, bunny_path, row_count, byte_size, archived_at, status)
              VALUES (?, 'meta_messages_sql', ?, ?, ?, ?, ?, 'done')`,
        args: [crypto.randomUUID(), day, blobPath, rows.length, byteSize, new Date().toISOString()],
      });

      // Collect document IDs to delete
      idsToDelete.push(...result.rows
        .filter(r => {
          const p = String(r.phone_number);
          const d = (r.sent_at || r.created_at || '').slice(0, 10);
          return p === phone && d === day;
        })
        .map(r => String(r.document_id)));

      totalArchived += rows.length;
      totalFreed += byteSize;
    } catch (err) {
      console.error(`[Archiver] Failed to archive meta-messages for ${phone}/${day}:`, err);
    }
  }

  // Bulk delete archived rows from DB (batches of 200)
  for (let i = 0; i < idsToDelete.length; i += 200) {
    const batch = idsToDelete.slice(i, i + 200);
    const placeholders = batch.map(() => '?').join(',');
    await bunnyExecute({
      sql: `DELETE FROM meta_messages_sql WHERE document_id IN (${placeholders})`,
      args: batch,
    });
  }

  console.log(`[Archiver] meta_messages_sql: archived ${totalArchived} rows, freed ~${Math.round(totalFreed / 1024)} KB`);
  return { archived: totalArchived, freed: totalFreed };
}

// ─── Form Submissions Archiver ────────────────────────────────────────────────

export async function archiveOldFormSubmissions(): Promise<{ archived: number; freed: number }> {
  await ensureArchiveSchema();

  const cutoff = daysAgo(KEEP_DAYS);

  // Check if table exists first
  const tableCheck = await bunnyExecute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='form_submissions'`,
    args: [],
  });
  if (tableCheck.rows.length === 0) return { archived: 0, freed: 0 };

  const result = await bunnyExecute({
    sql: `SELECT id, form_id, created_at, data_json
          FROM form_submissions
          WHERE created_at < ?
          ORDER BY created_at ASC`,
    args: [cutoff],
  });

  if (result.rows.length === 0) return { archived: 0, freed: 0 };

  // Group by date
  const groups = new Map<string, any[]>();
  for (const row of result.rows) {
    const day = String(row.created_at || '').slice(0, 10) || dateKey(new Date());
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push({ id: row.id, formId: row.form_id, ...JSON.parse(String(row.data_json)) });
  }

  let totalArchived = 0;
  let totalFreed = 0;
  const idsToDelete: string[] = [];

  for (const [day, rows] of groups.entries()) {
    const blobPath = `archives/form-submissions/${day}/batch.json.gz`;
    try {
      const byteSize = await uploadGzippedJson(blobPath, rows);
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO archive_log
              (id, table_name, date_key, bunny_path, row_count, byte_size, archived_at, status)
              VALUES (?, 'form_submissions', ?, ?, ?, ?, ?, 'done')`,
        args: [crypto.randomUUID(), day, blobPath, rows.length, byteSize, new Date().toISOString()],
      });
      idsToDelete.push(...result.rows
        .filter(r => String(r.created_at || '').slice(0, 10) === day)
        .map(r => String(r.id)));
      totalArchived += rows.length;
      totalFreed += byteSize;
    } catch (err) {
      console.error(`[Archiver] Failed to archive form-submissions for ${day}:`, err);
    }
  }

  for (let i = 0; i < idsToDelete.length; i += 200) {
    const batch = idsToDelete.slice(i, i + 200);
    const placeholders = batch.map(() => '?').join(',');
    await bunnyExecute({
      sql: `DELETE FROM form_submissions WHERE id IN (${placeholders})`,
      args: batch,
    });
  }

  console.log(`[Archiver] form_submissions: archived ${totalArchived} rows`);
  return { archived: totalArchived, freed: totalFreed };
}

// ─── Master archive runner ─────────────────────────────────────────────────────

export interface ArchiveResult {
  metaMessages: { archived: number; freed: number };
  formSubmissions: { archived: number; freed: number };
  totalArchivedRows: number;
  totalFreedBytes: number;
  runAt: string;
  keepDays: number;
}

export async function runDailyArchive(): Promise<ArchiveResult> {
  console.log(`[Archiver] Starting daily archive (keep last ${KEEP_DAYS} days in DB)...`);

  const [metaMessages, formSubmissions] = await Promise.all([
    archiveOldMetaMessages().catch(e => { console.error('[Archiver] meta error:', e); return { archived: 0, freed: 0 }; }),
    archiveOldFormSubmissions().catch(e => { console.error('[Archiver] forms error:', e); return { archived: 0, freed: 0 }; }),
  ]);

  const result: ArchiveResult = {
    metaMessages,
    formSubmissions,
    totalArchivedRows: metaMessages.archived + formSubmissions.archived,
    totalFreedBytes: metaMessages.freed + formSubmissions.freed,
    runAt: new Date().toISOString(),
    keepDays: KEEP_DAYS,
  };

  console.log(`[Archiver] Done. Total: ${result.totalArchivedRows} rows archived, ${Math.round(result.totalFreedBytes / 1024)} KB freed from DB.`);
  return result;
}

// ─── DB size estimate ──────────────────────────────────────────────────────────

export async function getDbStats(): Promise<{
  metaMessagesCount: number;
  formSubmissionsCount: number;
  archiveManifestCount: number;
  archiveLogCount: number;
}> {
  await ensureArchiveSchema();

  const [meta, forms, manifest, log] = await Promise.all([
    bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql`, args: [] }),
    bunnyExecute({ sql: `SELECT COUNT(*) as c FROM form_submissions WHERE 1=1`, args: [] }).catch(() => ({ rows: [{ c: 0 }] })),
    bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_archive_manifest_sql`, args: [] }),
    bunnyExecute({ sql: `SELECT COUNT(*) as c FROM archive_log`, args: [] }).catch(() => ({ rows: [{ c: 0 }] })),
  ]);

  return {
    metaMessagesCount: Number(meta.rows[0]?.c || 0),
    formSubmissionsCount: Number(forms.rows[0]?.c || 0),
    archiveManifestCount: Number(manifest.rows[0]?.c || 0),
    archiveLogCount: Number(log.rows[0]?.c || 0),
  };
}
