/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn(), getBunnyDatabase: jest.fn() }));
jest.mock('@/lib/bunny-storage', () => ({ fetchFromStorage: jest.fn() }));
jest.mock('@/lib/bunny-forms-db', () => ({ listForms: jest.fn(), listSubmissions: jest.fn() }));
jest.mock('@/lib/registrationAuth', () => ({
  registrationLeadOwned: (lead: Record<string, unknown>, viewer: { userId: string; superAdmin: boolean }) =>
    viewer.superAdmin || lead.createdByUserId === viewer.userId || lead.assignedToUserId === viewer.userId,
}));
import { createClient, type Client } from '@libsql/client';
import { bunnyExecute, getBunnyDatabase } from '@/lib/bunnyDatabase';
import { registrationAudienceRows, registrationAudienceMatches, registrationAudienceForBatch, registrationAudiencePayload, registrationRecipients } from '@/lib/registrationAudience';
import { mapRegistrationRecipients } from '@/lib/registrationAudienceRepository';
import { registrationDecisionKey } from '@/lib/registrationAiConfig';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { assembleRegistrationLeads, registrationBatchRows } from '@/lib/registrationLeads';

const batch = { id: 'hindi-batch', name: 'Hindi Workshop', language: 'Hindi', formId: 'google-form',
  metadata: { googleFormMapping: { Mobile: 'Contact for WhatsApp' } } };
const submission = (id: string, phone = '+91 9876543210') => ({ id, formId: 'google-form',
  source: 'google_forms', name: 'Student', dynamicAnswers: { 'Contact for WhatsApp': phone } });
const forms = [{ formId: 'google-form', workshopName: 'Hindi Workshop' }];

describe('Saved response-to-Meta recipient mapping', () => {
  it('normalizes international dialing prefixes before deduplicating real recipients', () => {
    const recipients = registrationRecipients([
      { id: 'one', phoneNumber: '00977 9847060920' },
      { id: 'two', phoneNumber: '+9779847060920' },
      { id: 'three', phoneNumber: '0091 9876543210' },
    ]);
    expect(recipients.map(row => row.phoneNumber)).toEqual(['9779847060920', '919876543210']);
  });
  it('keeps the browser audience under the serverless response limit without losing recipients or categories', () => {
    const rawAnswer = 'x'.repeat(20000);
    const state = { [registrationDecisionKey(batch.id, 'response')]: {
      status: 'approval_1', copies: ['pending_leads_1'], history: [rawAnswer], reason: rawAnswer,
    } };
    const rows = registrationAudienceRows(state, [], [{
      ...submission('response'), dynamicAnswers: { 'Contact for WhatsApp': '+91 9876543210', rawAnswer },
    }], forms, [batch]);
    const payload = registrationAudiencePayload(Array.from({ length: 1548 }, () => rows[0]), [
      { ...batch, metadata: { rawAnswer } },
    ]);
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(4_000_000);
    expect(payload.data).toHaveLength(1548);
    expect(payload.data[0]).not.toHaveProperty('_rawRecord');
    expect(payload.data[0].registrationDecision).not.toHaveProperty('history');
    expect(payload.workshops[0]).toEqual({
      id: batch.id, name: batch.name, language: batch.language, formId: batch.formId,
    });
    expect(registrationAudienceMatches(payload.data[0], 'approval_1')).toBe(true);
    expect(registrationAudienceMatches(payload.data[0], 'pending_leads_1')).toBe(true);
    expect(registrationRecipients(payload.data)).toHaveLength(1);
    expect(rows[0]._rawRecord.rawAnswer).toBe(rawAnswer);
  });

  it('loads approval decisions by batch/response, not contact ID or browser cache', () => {
    const state = { [registrationDecisionKey(batch.id, 'response')]: { status: 'approval_1' } };
    const rows = registrationAudienceRows(state, [], [submission('response')], forms, [batch]);
    expect(rows).toHaveLength(1);
    expect(rows[0].leadId).toBeUndefined();
    expect(rows[0].responseId).toBe('response');
    expect(rows[0].phoneNumber).toBe('919876543210');
    expect(registrationAudienceMatches(rows[0], 'Approvel-1')).toBe(true);
    expect(registrationAudienceMatches(rows[0], 'Approvel-2')).toBe(false);
    expect(registrationRecipients(rows)).toHaveLength(1);
  });

  it('keeps decisions isolated when two batches use the same form/response', () => {
    const other = { ...batch, id: 'other' };
    const state = {
      [registrationDecisionKey(batch.id, 'response')]: { status: 'approval_1' },
      [registrationDecisionKey(other.id, 'response')]: { status: 'pending_leads_1' },
    };
    const rows = registrationAudienceRows(state, [], [submission('response')], forms, [batch, other]);
    expect(rows.map(row => row.id)).toEqual(['hindi-batch:response', 'other:response']);
    expect(rows.filter(row => registrationAudienceMatches(row, 'Approvel-1'))).toHaveLength(1);
    expect(rows.filter(row => registrationAudienceMatches(row, 'Pending-1'))).toHaveLength(1);
    expect(registrationAudienceForBatch(rows, batch.id, 'Approvel-1')).toHaveLength(1);
    expect(registrationAudienceForBatch(rows, other.id, 'Approvel-1')).toHaveLength(0);
  });

  it('uses the same mapped nested CRM answers in All Leads Data and Trigger recipients', () => {
    const mappedBatch = {
      ...batch,
      metadata: { googleFormMapping: {
        Name: 'Full Name',
        Email: 'Email Address',
        Mobile: 'WhatsApp Contact',
      } },
    };
    const nestedSubmission = {
      ...submission('nested-response', ''),
      dynamicAnswers: {
        dynamicAnswers: {
          'Full Name': 'Mapped Student',
          'Email Address': 'student@example.com',
          'WhatsApp Contact': '+91 9876543210',
        },
      },
    };
    const dataRows = registrationBatchRows(assembleRegistrationLeads([], [nestedSubmission], forms), mappedBatch);
    const triggerRows = registrationAudienceRows({}, [], [nestedSubmission], forms, [mappedBatch]);
    expect(dataRows[0]).toMatchObject({
      name: 'Mapped Student',
      email: 'student@example.com',
      mobile: '+91 9876543210',
      phoneNumber: '+91 9876543210',
    });
    expect(registrationRecipients(triggerRows).map(row => ({
      name: row.name,
      email: row.email,
      phoneNumber: row.phoneNumber,
    }))).toEqual([{
      name: 'Mapped Student',
      email: 'student@example.com',
      phoneNumber: '919876543210',
    }]);
  });

  it('deduplicates recipients without collapsing genuine response records or country codes', () => {
    const rows = registrationAudienceRows({}, [], [
      submission('response-1'), submission('response-2'), submission('international', '+44 9876543210'),
      submission('invalid', '123'), submission('email-only', ''),
    ], forms, [batch]);
    expect(rows).toHaveLength(5);
    expect(registrationRecipients(rows).map(row => row.phoneNumber)).toEqual(['919876543210', '449876543210']);
  });

  it('includes Meta leads by connected form ID and excludes other Meta forms', () => {
    const metaBatch = { ...batch, formId: '', metadata: { facebookFormId: 'meta-form' } };
    const rows = registrationAudienceRows({}, [
      { _id: 'meta-lead', source: 'meta_instant_form', phoneNumber: '9876543210', metadata: { metaFormId: 'meta-form' } },
      { _id: 'foreign', source: 'meta_instant_form', metadata: { metaFormId: 'other-form' } },
    ], [], [], [metaBatch]);
    expect(rows).toHaveLength(1);
    expect(rows[0].leadId).toBe('meta-lead');
  });

  it('uses canonical Meta status when no form decision exists', () => {
    const row = { responseId: 'meta', status: 'approved' };
    expect(registrationAudienceMatches(row, 'approved')).toBe(true);
    expect(registrationAudienceMatches({ ...row, status: 'rejected' }, 'Rejected leads')).toBe(true);
    expect(registrationAudienceMatches({ ...row, status: 'rejected' }, 'All Leads')).toBe(false);
    expect(registrationAudienceMatches({ ...row, status: 'registered' }, 'Registered leads')).toBe(true);
  });

  describe('Bunny contact persistence', () => {
    let client: Client;
    beforeEach(async () => {
      client = createClient({ url: 'file::memory:' });
      jest.mocked(getBunnyDatabase).mockReturnValue(client);
      jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
      await client.execute(`CREATE TABLE leads_sql(document_id TEXT PRIMARY KEY,lead_key TEXT UNIQUE,
        owner_user_id TEXT,lead_number TEXT,data_json TEXT,created_at TEXT,updated_at TEXT)`);
    });
    afterEach(() => client.close());

    it('maps an unlinked Google response once across ten simultaneous schedule/broadcast requests', async () => {
      const rows = registrationAudienceRows({}, [], [submission('response')], forms, [batch]);
      const results = await Promise.all(Array.from({ length: 10 }, () =>
        mapRegistrationRecipients(rows, { userId: 'admincrm', superAdmin: true })));
      expect(new Set(results.map(result => result[0].leadId)).size).toBe(1);
      expect(await loadBunnyLeads()).toHaveLength(1);
      expect(rows[0].leadId).toBeUndefined();
      expect((await loadBunnyLeads())[0].phoneNumber).toBe('919876543210');
    });

    it('reuses an existing accessible contact without resetting its status or delivery evidence', async () => {
      const lead = { _id: 'existing', phoneNumber: '919876543210', status: 'customer',
        createdByUserId: 'admincrm', metadata: { wtStatus: 'sent' } };
      await client.execute({ sql: 'INSERT INTO leads_sql(document_id,lead_key,data_json) VALUES (?,?,?)',
        args: ['existing', 'admincrm#919876543210', JSON.stringify(lead)] });
      const rows = registrationAudienceRows({}, [], [submission('response')], forms, [batch]);
      const result = await mapRegistrationRecipients(rows, { userId: 'admincrm', superAdmin: true });
      expect(result[0].leadId).toBe('existing');
      expect((await loadBunnyLeads())[0].metadata.wtStatus).toBe('sent');
      expect((await loadBunnyLeads())[0].status).toBe('customer');
    });

    it('does not reuse another tenant contact and blocks an accessible blocked number', async () => {
      const lead = { _id: 'foreign', phoneNumber: '919876543210', createdByUserId: 'tenant-other', isBlocked: true };
      await client.execute({ sql: 'INSERT INTO leads_sql(document_id,lead_key,data_json) VALUES (?,?,?)',
        args: ['foreign', 'tenant-other#919876543210', JSON.stringify(lead)] });
      const rows = registrationAudienceRows({}, [], [submission('response')], forms, [batch]);
      const result = await mapRegistrationRecipients(rows, { userId: 'tenant', superAdmin: false });
      expect(result[0].leadId).not.toBe('foreign');
      await expect(mapRegistrationRecipients(rows, { userId: 'admincrm', superAdmin: true })).rejects.toThrow('blocked');
    });
  });
});
