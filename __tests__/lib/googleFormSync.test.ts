/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// `lib/bunnyDatabase.ts` resolves its configuration lazily on first query, so
// pointing it at a throwaway file database here is safe before any import runs.
const databaseDirectory = mkdtempSync(join(tmpdir(), 'google-form-sync-'));
process.env.BUNNY_DATABASE_URL = `file:${join(databaseDirectory, 'sync.db')}`;
process.env.BUNNY_DATABASE_AUTH_TOKEN = 'test-token';

import { bunnyExecute, closeBunnyDatabase } from '@/lib/bunnyDatabase';
import { ensureFormTables } from '@/lib/bunny-forms-db';
import { pendingGoogleFormLeads, savedGoogleResponseLeadIds } from '@/lib/googleFormsSync';
import { readGoogleFormSyncStatus, recordGoogleFormSyncError, recordGoogleFormSyncResult } from '@/lib/googleFormSyncStatus';

const FORM_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';

function lead(responseId: string, email = '', mobile = '') {
  return { responseId, email, mobile };
}

beforeAll(async () => {
  await ensureFormTables();
  await bunnyExecute({
    sql: 'INSERT INTO enquiry_forms (form_id, workshop_name) VALUES (?, ?)',
    args: [FORM_ID, 'Delta Test Form'],
  });
});

afterAll(() => {
  closeBunnyDatabase();
  rmSync(databaseDirectory, { recursive: true, force: true });
});

describe('savedGoogleResponseLeadIds', () => {
  it('records a saved response with its linked lead', async () => {
    await bunnyExecute({
      sql: `INSERT INTO form_submissions (id, form_id, form_data, source, lead_id, email)
        VALUES (?, ?, ?, 'google_forms', 'lead-1', 'first@example.com')`,
      args: ['gform_saved_1', FORM_ID, 'response-1'],
    });

    const saved = await savedGoogleResponseLeadIds(FORM_ID);
    expect(saved.get('response-1')).toBe('lead-1');
    expect(saved.size).toBe(1);
  });

  it('ignores rows that are not Google responses for this form', async () => {
    await bunnyExecute({
      sql: `INSERT INTO form_submissions (id, form_id, form_data, source, email)
        VALUES (?, ?, '', 'crm_form', 'crm@example.com')`,
      args: ['crm_submission_1', FORM_ID],
    });
    await bunnyExecute({
      sql: `INSERT INTO form_submissions (id, form_id, form_data, source, lead_id)
        VALUES (?, ?, ?, 'google_forms', 'lead-other')`,
      args: ['gform_other_form', 'some-other-form-id-000000', 'response-other'],
    });

    const saved = await savedGoogleResponseLeadIds(FORM_ID);
    expect([...saved.keys()]).toEqual(['response-1']);
  });
});

describe('pendingGoogleFormLeads', () => {
  it('treats a never-saved response as pending', () => {
    const saved = new Map<string, string>();
    const { pending, alreadySaved } = pendingGoogleFormLeads([lead('new-1', 'a@example.com')], saved);

    expect(pending.map(item => item.responseId)).toEqual(['new-1']);
    expect(alreadySaved).toBe(0);
  });

  it('skips a response that is saved and linked to a lead', async () => {
    const saved = await savedGoogleResponseLeadIds(FORM_ID);
    const { pending, alreadySaved } = pendingGoogleFormLeads([lead('response-1', 'a@example.com')], saved);

    expect(pending).toEqual([]);
    expect(alreadySaved).toBe(1);
  });

  it('re-processes a response that was saved but never linked to a lead', async () => {
    await bunnyExecute({
      sql: `INSERT INTO form_submissions (id, form_id, form_data, source, email)
        VALUES (?, ?, ?, 'google_forms', 'unlinked@example.com')`,
      args: ['gform_unlinked', FORM_ID, 'response-2'],
    });

    const saved = await savedGoogleResponseLeadIds(FORM_ID);
    expect(saved.get('response-2')).toBe('');

    const { pending } = pendingGoogleFormLeads([lead('response-2', 'unlinked@example.com')], saved);
    expect(pending.map(item => item.responseId)).toEqual(['response-2']);
  });

  it('does not retry a saved, unlinked response that has no contact details', async () => {
    await bunnyExecute({
      sql: `INSERT INTO form_submissions (id, form_id, form_data, source)
        VALUES (?, ?, ?, 'google_forms')`,
      args: ['gform_no_contact', FORM_ID, 'response-3'],
    });

    const saved = await savedGoogleResponseLeadIds(FORM_ID);
    const { pending, alreadySaved } = pendingGoogleFormLeads([lead('response-3')], saved);

    expect(pending).toEqual([]);
    expect(alreadySaved).toBe(1);
  });

  it('re-processes everything when a full refresh is requested', async () => {
    const saved = await savedGoogleResponseLeadIds(FORM_ID);
    const { pending, alreadySaved } = pendingGoogleFormLeads([lead('response-1', 'a@example.com')], saved, true);

    expect(pending).toHaveLength(1);
    expect(alreadySaved).toBe(0);
  });
});

describe('partial import recovery', () => {
  it('reaches the tail when earlier responses are already saved', async () => {
    // Mirrors the reported symptom: Google holds 164 responses, 151 are saved.
    const total = 164;
    const savedUpTo = 151;
    const leads = Array.from({ length: total }, (_, index) => lead(`tail-${index + 1}`, `user${index + 1}@example.com`));

    for (let index = 1; index <= savedUpTo; index += 1) {
      await bunnyExecute({
        sql: `INSERT INTO form_submissions (id, form_id, form_data, source, lead_id, email)
          VALUES (?, ?, ?, 'google_forms', ?, ?)`,
        args: [`gform_tail_${index}`, FORM_ID, `tail-${index}`, `lead-${index}`, `user${index}@example.com`],
      });
    }

    const saved = await savedGoogleResponseLeadIds(FORM_ID);
    const { pending, alreadySaved } = pendingGoogleFormLeads(leads, saved);

    expect(alreadySaved).toBe(savedUpTo);
    expect(pending).toHaveLength(total - savedUpTo);
    expect(pending[0].responseId).toBe('tail-152');
    expect(pending[pending.length - 1].responseId).toBe('tail-164');
  });
});

describe('sync status history', () => {
  it('records a successful run and preserves it when a later run fails', async () => {
    await recordGoogleFormSyncResult({
      formId: FORM_ID,
      scope: 'shared',
      formName: 'Delta Test Form',
      responseCount: 164,
      savedCount: 151,
      importedCount: 0,
    });

    const success = await readGoogleFormSyncStatus(FORM_ID);
    expect(success).toMatchObject({
      formId: FORM_ID,
      formName: 'Delta Test Form',
      status: 'ok',
      responseCount: 164,
      savedCount: 151,
    });
    expect(success?.lastSuccessAt).not.toBe('');

    await recordGoogleFormSyncError({
      formId: FORM_ID,
      scope: 'shared',
      error: 'Google Forms responses request failed (500 Internal Server Error)',
    });

    const failure = await readGoogleFormSyncStatus(FORM_ID);
    expect(failure?.status).toBe('error');
    expect(failure?.lastError).toContain('500');
    // A failed run must not wipe the last known totals or the last success time.
    expect(failure?.responseCount).toBe(164);
    expect(failure?.savedCount).toBe(151);
    expect(failure?.lastSuccessAt).toBe(success?.lastSuccessAt);
  });

  it('reports the outstanding gap between Google and Bunny', async () => {
    const status = await readGoogleFormSyncStatus(FORM_ID);
    expect((status?.responseCount ?? 0) - (status?.savedCount ?? 0)).toBe(13);
  });
});
