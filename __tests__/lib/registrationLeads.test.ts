/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleRegistrationLeads, filterRegistrationLeads } from '@/lib/registrationLeads';

const databaseDirectory = mkdtempSync(join(tmpdir(), 'registration-leads-'));
process.env.BUNNY_DATABASE_URL = `file:${join(databaseDirectory, 'registration.db')}`;
process.env.BUNNY_DATABASE_AUTH_TOKEN = 'test-token';

import { bunnyExecute, closeBunnyDatabase } from '@/lib/bunnyDatabase';
import { createSubmission, ensureFormTables, listSubmissions } from '@/lib/bunny-forms-db';

const FORM_ID = 'google-form-hindi';

beforeAll(async () => {
  await ensureFormTables();
  await bunnyExecute({
    sql: 'INSERT INTO enquiry_forms (form_id, workshop_name, is_active) VALUES (?, ?, 1)',
    args: [FORM_ID, 'Hindi Workshop'],
  });
});

afterAll(() => {
  closeBunnyDatabase();
  rmSync(databaseDirectory, { recursive: true, force: true });
});

describe('registration lead sources', () => {
  it('persists a public CRM submission with its explicit form and lead IDs', async () => {
    await createSubmission({
      formId: FORM_ID,
      leadId: 'lead-123',
      name: 'CRM submission',
      mobile: '919000000001',
      email: 'crm@example.com',
      answers: { workshopLanguage: 'Hindi' },
    });

    const [submission] = await listSubmissions(FORM_ID);
    expect(submission.leadId).toBe('lead-123');
    expect(submission.source).toBe('');
    expect(submission.answers).toEqual({ workshopLanguage: 'Hindi' });
  });

  it('keeps CRM submissions and Google responses for the same form in All Leads Data', () => {
    const rows = assembleRegistrationLeads([], [
      {
        id: 'crm-submission-1',
        formId: FORM_ID,
        name: 'CRM submission',
        mobile: '919000000001',
        email: 'crm@example.com',
        source: '',
        answers: { 'Workshop date': 'Hindi batch' },
      },
      {
        id: 'gform-google-1',
        formId: FORM_ID,
        formData: 'google-response-1',
        responseId: 'google-response-1',
        name: 'Google response',
        mobile: '919000000002',
        email: 'google@example.com',
        source: 'google_forms',
        dynamicAnswers: { 'Workshop date': 'Hindi batch' },
      },
    ], [{ formId: FORM_ID, workshopName: 'Hindi Workshop' }]);

    const visible = filterRegistrationLeads(rows, FORM_ID, 'Hindi');

    expect(visible).toHaveLength(2);
    expect(visible.map(row => row.source).sort()).toEqual(['crm_form', 'google_forms']);
  });
});
