/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn(), getBunnyDatabase: jest.fn() }));
jest.mock('@/lib/bunnyBroadcastRepository', () => ({ ensureBroadcastSchema: jest.fn(async () => {}) }));
jest.mock('@/lib/bunny-storage', () => ({ fetchFromStorage: jest.fn() }));
jest.mock('@/lib/whatsapp', () => ({
  normalizePhone: (value: unknown) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 10 ? `91${digits}` : digits;
  },
}));
import { createClient, type Client } from '@libsql/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bunnyExecute, bunnyBatch, getBunnyDatabase } from '@/lib/bunnyDatabase';
import { persistMetaFormLead } from '@/lib/bunnyMetaLeadIngestion';
import { processRegistrationApprovals } from '@/lib/registrationAutomation';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { metaApprovalConfigurationError } from '@/lib/registrationMetaAutomation';
import { parseRegistrationValue } from '@/lib/registrationValues';

const config = () => ({ isActive: true, filters: [{ question: 'Ready', options: [
  { answer: 'Yes', category: 'approved' }, { answer: 'No', category: 'rejected' },
], fallbackCategory: 'pending' }] });
const metadata = () => ({
  facebookFormId: 'form', ai9AConfig: config(), ai9BConfig: config(), ai9CConfig: config(), ai9DConfig: config(),
  ai9EConfig: { isActive: true, filters: [] },
  wtSettings: { approved: { template: 'welcome', delay: 0 }, pending: { template: 'welcome', delay: 0 } },
  metaAutomation: { enabled: true, approvalOnly: true, startsAt: '2026-10-11T00:00:00Z' },
});
const input = (eventId = 'event', answer = 'Yes', createdAt = '2026-10-12T00:00:00Z') => ({
  source: 'meta_instant_form', phoneNumber: '+91 9876543210', email: 'student@example.test', createdAt,
  metadata: { leadgen_id: eventId, metaFormId: 'form', rawFieldData: [{ name: 'Ready', values: [answer] }] },
});

describe('Future-only four-stage Meta automation', () => {
  let client: Client;
  let databaseDirectory: string;
  beforeEach(async () => {
    jest.clearAllMocks();
    databaseDirectory = mkdtempSync(join(tmpdir(), 'meta-identity-test-'));
    client = createClient({ url: `file:${join(databaseDirectory, 'contacts.db')}` });
    jest.mocked(getBunnyDatabase).mockReturnValue(client);
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    await client.execute(`CREATE TABLE leads_sql (document_id TEXT PRIMARY KEY, lead_key TEXT UNIQUE,
      owner_user_id TEXT, lead_number TEXT, data_json TEXT, created_at TEXT, updated_at TEXT)`);
    await client.execute(`CREATE TABLE whatsapp_templates_sql (document_id TEXT, template_name TEXT, status TEXT,
      provider TEXT, created_by TEXT, language TEXT, updated_at TEXT, data_json TEXT)`);
    await client.execute(`INSERT INTO whatsapp_templates_sql VALUES ('template','welcome','APPROVED','meta','admincrm','en','','{}')`);
    await client.execute(`CREATE TABLE broadcast_runs_sql (document_id TEXT PRIMARY KEY, broadcast_run_key TEXT,
      name TEXT, created_by_user_id TEXT, created_by_label TEXT, mode TEXT, provider TEXT, status TEXT,
      template_id TEXT, scheduled_at TEXT, data_json TEXT, created_at TEXT, updated_at TEXT)`);
    await client.execute(`CREATE TABLE broadcast_run_messages_sql (document_id TEXT PRIMARY KEY, run_id TEXT,
      lead_id TEXT, phone_number TEXT, status TEXT, wa_message_id TEXT, created_at TEXT, updated_at TEXT)`);
  });
  afterEach(() => { client.close(); rmSync(databaseDirectory, { recursive: true }); });

  it('requires every saved active stage and restores nested legacy settings', () => {
    const saved = metadata();
    expect(metaApprovalConfigurationError(saved)).toBeNull();
    saved.ai9CConfig.isActive = false;
    expect(metaApprovalConfigurationError(saved)).toContain('AI-9C');
    expect(parseRegistrationValue(JSON.stringify(JSON.stringify([{ id: 'batch' }])), [])).toEqual([{ id: 'batch' }]);
  });

  it('preserves one lead, creation time and approval across ten webhook/sync replays', async () => {
    const first = await persistMetaFormLead(input());
    await client.execute({ sql: `UPDATE leads_sql SET data_json = json_set(data_json,
      '$.status','approved','$.metadata.wtStatus','sent') WHERE document_id = ?`, args: [first._id] });
    for (let replay = 0; replay < 10; replay++) {
      const saved = await persistMetaFormLead({ ...input(), createdAt: '2026-10-20T00:00:00Z', status: 'new' });
      expect(saved._id).toBe(first._id);
      expect(saved.status).toBe('approved');
      expect(saved.createdAt).toBe('2026-10-12T00:00:00Z');
      expect(saved.metadata.wtStatus).toBe('sent');
      expect(saved.metadata.metaLeadId).toBe('event');
    }
    expect(await loadBunnyLeads()).toHaveLength(1);
  });

  it('claims concurrent events for the same normalized contact only once', async () => {
    const saved = await Promise.all(Array.from({ length: 10 }, (_, index) =>
      persistMetaFormLead(input(`event-${index}`))));
    expect(new Set(saved.map(lead => lead._id)).size).toBe(1);
    expect(await loadBunnyLeads()).toHaveLength(1);
  });

  it('queues exactly one run after four approvals across ten worker replays', async () => {
    await persistMetaFormLead(input());
    const state = { crm_workshops: [{ id: 'batch', metadata: metadata() }] };
    for (let replay = 0; replay < 10; replay++) {
      await processRegistrationApprovals(state, await loadBunnyLeads(), 'admincrm', true,
        new Date(`2026-10-12T00:${String(replay).padStart(2, '0')}:00Z`));
    }
    expect((await client.execute('SELECT document_id FROM broadcast_runs_sql')).rows).toHaveLength(1);
    expect((await client.execute('SELECT document_id FROM broadcast_run_messages_sql')).rows).toHaveLength(1);
    expect((await loadBunnyLeads())[0].metadata.ai9PassedStages).toEqual({
      ai9AConfig: true, ai9BConfig: true, ai9CConfig: true, ai9DConfig: true,
    });
  });

  it('does not bypass four-stage proof for manually approved or blocked leads', async () => {
    const lead = await persistMetaFormLead(input());
    await client.execute({ sql: `UPDATE leads_sql SET data_json = json_set(data_json,
      '$.status','approved','$.metadata.ai9WEligible',json('true'),'$.metadata.approvedAt','2026-10-12T01:00:00Z')
      WHERE document_id = ?`, args: [lead._id] });
    const state = { crm_workshops: [{ id: 'batch', metadata: metadata() }] };
    await processRegistrationApprovals(state, await loadBunnyLeads(), 'admincrm', true);
    expect((await client.execute('SELECT document_id FROM broadcast_runs_sql')).rows).toHaveLength(0);
    await client.execute({ sql: `UPDATE leads_sql SET data_json = json_set(data_json,
      '$.status','new','$.isBlocked',json('true')) WHERE document_id = ?`, args: [lead._id] });
    await processRegistrationApprovals(state, await loadBunnyLeads(), 'admincrm', true);
    expect((await loadBunnyLeads())[0].status).toBe('new');
    expect((await client.execute('SELECT document_id FROM broadcast_runs_sql')).rows).toHaveLength(0);
  });

  it('uses one queue identity even if concurrent workers observe different approval times', async () => {
    const lead = await persistMetaFormLead(input());
    const state = { crm_workshops: [{ id: 'batch', metadata: metadata() }] };
    await Promise.all(Array.from({ length: 10 }, (_, index) =>
      processRegistrationApprovals(state, [JSON.parse(JSON.stringify(lead))], 'admincrm', true,
        new Date(`2026-10-12T00:${String(index).padStart(2, '0')}:00Z`))));
    expect((await client.execute('SELECT document_id FROM broadcast_runs_sql')).rows).toHaveLength(1);
    expect((await client.execute('SELECT document_id FROM broadcast_run_messages_sql')).rows).toHaveLength(1);
  });

  it.each(['No', 'Maybe'])('never queues rejected or pending answers: %s', async answer => {
    await persistMetaFormLead(input('event', answer));
    await processRegistrationApprovals({ crm_workshops: [{ id: 'batch', metadata: metadata() }] },
      await loadBunnyLeads(), 'admincrm', true);
    expect((await client.execute('SELECT document_id FROM broadcast_runs_sql')).rows).toHaveLength(0);
  });

  it('never queues the pre-activation audience, even if it now passes every rule', async () => {
    await persistMetaFormLead(input('old-event', 'Yes', '2026-10-10T00:00:00Z'));
    await processRegistrationApprovals({ crm_workshops: [{ id: 'batch', metadata: metadata() }] },
      await loadBunnyLeads(), 'admincrm', true);
    expect((await client.execute('SELECT document_id FROM broadcast_runs_sql')).rows).toHaveLength(0);
  });

  it('preserves old accepted bulk recipients and checks template-name history when config uses an ID', async () => {
    await persistMetaFormLead(input());
    await client.execute(`INSERT INTO broadcast_runs_sql(document_id,created_by_user_id,template_id) VALUES ('bulk','admincrm','template')`);
    await client.execute(`INSERT INTO broadcast_run_messages_sql(document_id,run_id,phone_number,wa_message_id) VALUES ('recipient','bulk','919876543210','wamid.accepted')`);
    const saved = metadata();
    saved.wtSettings.approved.template = 'template';
    await processRegistrationApprovals({ crm_workshops: [{ id: 'batch', metadata: saved }] },
      await loadBunnyLeads(), 'admincrm', true);
    expect((await client.execute("SELECT document_id FROM broadcast_runs_sql WHERE document_id != 'bulk'")).rows).toHaveLength(0);
  });
});
