import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import type { GoogleFormSyncStatus } from '@/lib/googleFormSyncStatusTypes';

/**
 * Persisted per-form Google Forms sync history.
 *
 * Without this the only evidence a scheduled import ran is the cron log, which
 * expires. Recording the outcome of every run lets the CRM show when a form was
 * last touched, how many Google responses exist, how many are saved in Bunny,
 * and the last error — i.e. why responses were not imported.
 */

export type { GoogleFormSyncStatus };

let tablesReady = false;
let tablesInitialization: Promise<void> | undefined;

async function initializeTable() {
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS google_form_sync_status (
      form_id         TEXT PRIMARY KEY,
      scope           TEXT NOT NULL DEFAULT '',
      form_name       TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'ok',
      last_run_at     TEXT NOT NULL DEFAULT (datetime('now')),
      last_success_at TEXT DEFAULT '',
      response_count  INTEGER NOT NULL DEFAULT 0,
      saved_count     INTEGER NOT NULL DEFAULT 0,
      imported_count  INTEGER NOT NULL DEFAULT 0,
      last_error      TEXT NOT NULL DEFAULT '',
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });
  await bunnyBatch([
    { sql: `CREATE INDEX IF NOT EXISTS idx_gform_sync_scope ON google_form_sync_status(scope)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_gform_sync_run ON google_form_sync_status(last_run_at)`, args: [] },
  ]);
}

export async function ensureGoogleFormSyncStatusTable() {
  if (tablesReady) return;
  if (!tablesInitialization) {
    tablesInitialization = initializeTable().catch(error => {
      tablesInitialization = undefined;
      throw error;
    });
  }
  await tablesInitialization;
  tablesReady = true;
}

function rowToStatus(row: Record<string, any>): GoogleFormSyncStatus {
  return {
    formId: String(row.form_id ?? ''),
    scope: String(row.scope ?? ''),
    formName: String(row.form_name ?? ''),
    status: row.status === 'error' ? 'error' : 'ok',
    lastRunAt: String(row.last_run_at ?? ''),
    lastSuccessAt: String(row.last_success_at ?? ''),
    responseCount: Number(row.response_count ?? 0),
    savedCount: Number(row.saved_count ?? 0),
    importedCount: Number(row.imported_count ?? 0),
    lastError: String(row.last_error ?? ''),
  };
}

export async function recordGoogleFormSyncResult(input: {
  formId: string;
  scope?: string;
  formName?: string;
  responseCount: number;
  savedCount: number;
  importedCount: number;
  error?: string;
}): Promise<void> {
  await ensureGoogleFormSyncStatusTable();
  const error = String(input.error || '').trim();
  const succeeded = !error;
  await bunnyExecute({
    sql: `INSERT INTO google_form_sync_status
      (form_id, scope, form_name, status, last_run_at, last_success_at,
       response_count, saved_count, imported_count, last_error, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(form_id) DO UPDATE SET
        scope          = excluded.scope,
        form_name      = CASE WHEN excluded.form_name != '' THEN excluded.form_name ELSE google_form_sync_status.form_name END,
        status         = excluded.status,
        last_run_at    = excluded.last_run_at,
        last_success_at = CASE WHEN excluded.last_success_at != '' THEN excluded.last_success_at ELSE google_form_sync_status.last_success_at END,
        response_count = excluded.response_count,
        saved_count    = excluded.saved_count,
        imported_count = excluded.imported_count,
        last_error     = excluded.last_error,
        updated_at     = excluded.updated_at`,
    args: [
      input.formId,
      String(input.scope || ''),
      String(input.formName || ''),
      succeeded ? 'ok' : 'error',
      succeeded ? new Date().toISOString() : '',
      Math.max(0, Math.trunc(input.responseCount)),
      Math.max(0, Math.trunc(input.savedCount)),
      Math.max(0, Math.trunc(input.importedCount)),
      error,
    ],
  });
}

export async function readGoogleFormSyncStatus(
  formId: string,
): Promise<GoogleFormSyncStatus | null> {
  await ensureGoogleFormSyncStatusTable();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM google_form_sync_status WHERE form_id = ?',
    args: [formId],
  });
  return result.rows[0] ? rowToStatus(result.rows[0] as Record<string, any>) : null;
}

/** Status rows for the given forms, or every recorded form when none are given. */
export async function readGoogleFormSyncStatusMap(
  formIds: string[],
): Promise<Record<string, GoogleFormSyncStatus>> {
  await ensureGoogleFormSyncStatusTable();
  const unique = [...new Set(formIds.map(String).map(value => value.trim()).filter(Boolean))];
  const rows = unique.length
    ? await bunnyExecute({
        sql: `SELECT * FROM google_form_sync_status
          WHERE form_id IN (${unique.map(() => '?').join(',')})`,
        args: unique,
      })
    : await bunnyExecute('SELECT * FROM google_form_sync_status');
  const map: Record<string, GoogleFormSyncStatus> = {};
  for (const row of rows.rows) {
    const status = rowToStatus(row as Record<string, any>);
    map[status.formId] = status;
  }
  return map;
}
/**
 * Records a failed run without discarding the last known response/saved counts.
 * Used when a form could not be reached at all, so the UI keeps showing the most
 * recent successful totals alongside the new error.
 */
export async function recordGoogleFormSyncError(input: {
  formId: string;
  scope?: string;
  error: string;
}): Promise<void> {
  await ensureGoogleFormSyncStatusTable();
  const error = String(input.error || '').trim();
  await bunnyExecute({
    sql: `INSERT INTO google_form_sync_status
      (form_id, scope, form_name, status, last_run_at, response_count, saved_count, imported_count, last_error, updated_at)
      VALUES (?, ?, '', 'error', datetime('now'), 0, 0, 0, ?, datetime('now'))
      ON CONFLICT(form_id) DO UPDATE SET
        scope          = excluded.scope,
        status         = 'error',
        last_run_at    = excluded.last_run_at,
        imported_count = 0,
        last_error     = excluded.last_error,
        updated_at     = excluded.updated_at`,
    args: [input.formId, String(input.scope || ''), error],
  });
}
