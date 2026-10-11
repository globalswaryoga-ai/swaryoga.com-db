/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ getBunnyDatabase: jest.fn(), bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
import { createClient, type Client } from '@libsql/client';
import { getBunnyDatabase, bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { persistBunnyContact } from '@/lib/bunnyContactIdentity';
import { getBunnyLeadById, loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { assembleRegistrationLeads } from '@/lib/registrationLeads';
import { createSubmission, listSubmissions } from '@/lib/bunny-forms-db';

describe('Permanent Bunny contact identity', () => {
  let client: Client;
  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    jest.mocked(getBunnyDatabase).mockReturnValue(client);
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    await client.execute(`CREATE TABLE leads_sql(document_id TEXT PRIMARY KEY,lead_key TEXT UNIQUE,
      owner_user_id TEXT,lead_number TEXT,data_json TEXT,created_at TEXT,updated_at TEXT)`);
  });
  afterEach(() => client.close());

  it('creates one permanent ID and lead number across ten simultaneous imports', async () => {
    const saved = await Promise.all(Array.from({ length: 10 }, () =>
      persistBunnyContact({ email: 'Student@Example.test', phoneNumber: '9876543210' })));
    expect(new Set(saved.map(lead => lead._id)).size).toBe(1);
    expect(new Set(saved.map(lead => lead.leadNumber)).size).toBe(1);
    expect(await loadBunnyLeads()).toHaveLength(1);
    expect((await client.execute('SELECT * FROM lead_contact_identities_sql')).rows).toHaveLength(2);
  });
  it('links an email-only record when WhatsApp arrives later without changing its ID', async () => {
    const first = await persistBunnyContact({ email: 'student@example.test' });
    const next = await persistBunnyContact({ email: 'STUDENT@example.test', phoneNumber: '9876543210' }, 'admincrm');
    expect(next._id).toBe(first._id);
    expect(next.leadNumber).toBe(first.leadNumber);
  });
  it('merges conflicting email/phone contacts but retains old IDs and message history', async () => {
    const first = await persistBunnyContact({ email: 'student@example.test', status: 'approved',
      metadata: { wtStatus: 'sent', wtLastTemplates: ['welcome'] } });
    const second = await persistBunnyContact({ phoneNumber: '9876543210', isBlocked: true });
    const merged = await persistBunnyContact({ email: 'student@example.test', phoneNumber: '9876543210', status: 'new' });
    expect(await loadBunnyLeads()).toHaveLength(1);
    expect(merged._id).toBe(first._id);
    expect(merged.status).toBe('approved');
    expect(merged.isBlocked).toBe(true);
    expect(merged.metadata.wtStatus).toBe('sent');
    expect((await getBunnyLeadById(second._id))._id).toBe(first._id);
    expect((await client.execute('SELECT document_id FROM leads_sql')).rows).toHaveLength(2);
    expect(assembleRegistrationLeads([merged], [{ id: 'response', leadId: second._id, formId: 'form' }], [])[0].leadId).toBe(first._id);
  });
  it('preserves tenant isolation and country codes', async () => {
    const first = await persistBunnyContact({ email: 'same@example.test', phoneNumber: '+91 9876543210' }, 'tenant-a');
    const second = await persistBunnyContact({ email: 'same@example.test', phoneNumber: '+91 9876543210' }, 'tenant-b');
    const third = await persistBunnyContact({ phoneNumber: '+44 9876543210' }, 'tenant-a');
    expect(new Set([first._id, second._id, third._id]).size).toBe(3);
  });
  it('automatically links CRM submissions immediately, keeping responses separate from one contact', async () => {
    await createSubmission({ formId: 'form', name: 'Student', email: 'Student@example.test', mobile: '9876543210' });
    await createSubmission({ formId: 'form', name: 'Student', email: 'student@example.test', mobile: '+91 9876543210' });
    const submissions = await listSubmissions('form');
    expect(submissions).toHaveLength(2);
    expect(new Set(submissions.map(row => row.leadId)).size).toBe(1);
    expect(await loadBunnyLeads()).toHaveLength(1);
    expect(submissions.every(row => Boolean(row.leadId))).toBe(true);
  });
});
