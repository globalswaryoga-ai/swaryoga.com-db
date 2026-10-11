/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyBatch: jest.fn(), bunnyExecute: jest.fn(), getBunnyDatabase: jest.fn() }));
jest.mock('@/lib/bunny-forms-db', () => ({ ensureFormTables: jest.fn(async () => {}) }));
import { createClient, type Client } from '@libsql/client';
import { bunnyBatch, bunnyExecute, getBunnyDatabase } from '@/lib/bunnyDatabase';
import { persistGoogleFormSubmission, fetchGoogleFormResponses } from '@/lib/googleFormsSync';
import { assembleRegistrationLeads, mergeRegistrationSnapshot } from '@/lib/registrationLeads';

describe('Google response parity across repeated syncs', () => {
  let client: Client;
  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    await client.execute(`CREATE TABLE form_submissions (
      id TEXT PRIMARY KEY, form_id TEXT, form_data TEXT, name TEXT, mobile TEXT, email TEXT,
      gender TEXT, city TEXT, answers TEXT, raw_answers TEXT, source TEXT, created_at TEXT, lead_id TEXT
    )`);
    await client.execute('CREATE TABLE enquiry_forms (form_id TEXT PRIMARY KEY, submission_count INTEGER DEFAULT 0, created_by TEXT)');
    await client.execute(`CREATE TABLE leads_sql(document_id TEXT PRIMARY KEY,lead_key TEXT UNIQUE,owner_user_id TEXT,
      lead_number TEXT,data_json TEXT,created_at TEXT,updated_at TEXT)`);
    await client.execute("INSERT INTO enquiry_forms(form_id) VALUES ('form')");
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(getBunnyDatabase).mockReturnValue(client);
  });
  afterEach(() => client.close());
  it('keeps exactly two genuine responses across ten syncs and updates edited answers', async () => {
    let firstId = '';
    for (let sync = 0; sync < 10; sync++) {
      const first = await persistGoogleFormSubmission({ formId: 'form', responseId: 'r1', email: 'same@example.test', answers: { Ready: sync === 9 ? 'No' : 'Yes' } });
      const second = await persistGoogleFormSubmission({ formId: 'form', responseId: 'r2', email: 'same@example.test', answers: { Ready: 'Yes' } });
      firstId ||= first.id;
      expect(first.id).toBe(firstId);
      expect(second.id).not.toBe(first.id);
    }
    const rows = await client.execute('SELECT * FROM form_submissions ORDER BY form_data');
    expect(rows.rows).toHaveLength(2);
    expect(JSON.parse(String(rows.rows[0].answers))).toEqual({ Ready: 'No' });
    expect((await client.execute('SELECT submission_count FROM enquiry_forms')).rows[0].submission_count).toBe(2);
    expect((await client.execute('SELECT document_id FROM leads_sql')).rows).toHaveLength(1);
    expect(new Set(rows.rows.map(row => row.lead_id)).size).toBe(1);
  });
  it('preserves a legacy identity and prevents another copy on replay', async () => {
    await client.execute("INSERT INTO form_submissions(id,form_id,form_data,source) VALUES ('legacy','form','r1','google_forms')");
    for (let count = 0; count < 10; count++) expect(await persistGoogleFormSubmission({ formId: 'form', responseId: 'r1' })).toEqual({ id: 'legacy', inserted: false });
    expect((await client.execute('SELECT id FROM form_submissions')).rows).toHaveLength(1);
  });
  it('serializes simultaneous retries without duplicating rows or drifting counts', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () =>
      persistGoogleFormSubmission({ formId: 'form', responseId: 'concurrent', answers: { Ready: 'Yes' } })));
    expect(new Set(results.map(result => result.id)).size).toBe(1);
    expect(results.filter(result => result.inserted)).toHaveLength(1);
    expect((await client.execute('SELECT id FROM form_submissions')).rows).toHaveLength(1);
    expect((await client.execute('SELECT submission_count FROM enquiry_forms')).rows[0].submission_count).toBe(1);
  });
  it('does not add linked contacts or legacy duplicate imports to response counts', () => {
    const submissions = [
      { id: 'gform_one', formId: 'form', formData: 'r1', source: 'google_forms', mobile: '9999999999' },
      { id: 'gform_legacy', formId: 'form', formData: 'r1', source: 'google_forms', mobile: '9999999999' },
      { id: 'gform_two', formId: 'form', formData: 'r2', source: 'google_forms', mobile: '9999999999' },
      { id: 'crm_response', formId: 'crm-form', mobile: '9999999999' },
    ];
    const rows = assembleRegistrationLeads([{ _id: 'contact', phoneNumber: '919999999999', googleFormId: 'form', source: 'google_forms' }], submissions, []);
    expect(rows).toHaveLength(3);
    expect(rows.every(row => row.leadId === 'contact')).toBe(true);
    expect(mergeRegistrationSnapshot(rows, [submissions[0]], 'form')).toHaveLength(2);
  });
  it('accepts an empty Google form and deduplicates repeated response IDs between pages', async () => {
    const empty = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
    expect(await fetchGoogleFormResponses('form', 'token', empty as unknown as typeof fetch)).toEqual([]);
    const pages = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ responses: [{ responseId: 'r1' }], nextPageToken: 'next' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ responses: [{ responseId: 'r1' }, { responseId: 'r2' }] }) });
    expect(await fetchGoogleFormResponses('form', 'token', pages as typeof fetch)).toHaveLength(2);
  });
});
