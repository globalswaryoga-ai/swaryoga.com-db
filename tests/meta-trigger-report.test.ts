/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
jest.mock('@/lib/bunnyBroadcastRepository', () => ({ ensureBroadcastSchema: jest.fn() }));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn() }));
jest.mock('@/lib/registrationAuth', () => ({
  registrationViewer: jest.fn(() => ({ userId: 'admincrm', superAdmin: true })),
  registrationLeadOwned: jest.fn(() => true),
}));
import { createClient, type Client } from '@libsql/client';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { registrationViewer } from '@/lib/registrationAuth';
import { GET, POST } from '@/app/api/admin/crm/meta-leads/trigger-report/route';
import { metaLeadCounts } from '@/lib/registrationMetaReport';

describe('Meta trigger report evidence and safe actions', () => {
  let client: Client;
  const report = () => GET(new Request('http://localhost/api/report?workshopId=batch&metaFormId=form'));
  const action = (runId: string, name: string, scheduledAt?: string) => POST(new Request('http://localhost/api/report', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId, action: name, scheduledAt }),
  }));
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'admincrm', superAdmin: true });
    client = createClient({ url: 'file::memory:' });
    await client.execute(`CREATE TABLE broadcast_runs_sql (
      document_id TEXT PRIMARY KEY, name TEXT, created_by_label TEXT, created_by_user_id TEXT,
      status TEXT, template_id TEXT, scheduled_at TEXT, created_at TEXT, updated_at TEXT,
      completed_at TEXT, data_json TEXT)`);
    await client.execute(`CREATE TABLE broadcast_run_messages_sql (
      document_id TEXT PRIMARY KEY, run_id TEXT, lead_id TEXT, phone_number TEXT, status TEXT,
      wa_message_id TEXT, failure_reason TEXT, sent_at TEXT, delivered_at TEXT, read_at TEXT, updated_at TEXT)`);
    await client.execute('CREATE TABLE leads_sql(document_id TEXT PRIMARY KEY, data_json TEXT)');
    const leads = Array.from({ length: 56 }, (_, index) => ({
      _id: `lead-${index}`, source: 'meta_instant_form', workshopId: 'batch',
      status: index < 40 ? 'approved' : index < 46 ? 'new_rejected' : index < 53 ? 'new' : index === 53 ? 'stage_1_new' : index === 54 ? 'csv-import' : 'enrolled',
      metadata: { metaFormId: 'form', ...(index < 40 ? { wtStatus: 'sent' } : {}) },
    }));
    jest.mocked(loadBunnyLeads).mockResolvedValue(leads);
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    await client.execute({
      sql: `INSERT INTO broadcast_runs_sql VALUES ('run', 'Welcome', 'Registration Automation', 'admincrm', 'scheduled', 'template', ?, ?, ?, NULL, ?)`,
      args: [new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), JSON.stringify({ target: { registrationEventKey: 'batch:event' }, senderNumber: '919000000000' })],
    });
    for (const [index, status, waId, reason] of [
      [0, 'sent', 'wamid.sent', ''], [1, 'delivered', 'wamid.delivered', ''],
      [2, 'failed', null, 'Temporary provider error'], [3, 'pending', null, ''],
      [4, 'failed', null, 'Invalid phone number'],
    ]) await client.execute({
      sql: 'INSERT INTO broadcast_run_messages_sql(document_id,run_id,lead_id,phone_number,status,wa_message_id,failure_reason) VALUES (?,?,?,?,?,?,?)',
      args: [`message-${index}`, 'run', `lead-${index}`, '919000000000', status, waId, reason],
    });
  });
  afterEach(() => client.close());
  it('accounts for all 56 leads and does not interpret 40 historical flags as 40 verified sends', async () => {
    expect(metaLeadCounts(await loadBunnyLeads())).toEqual({ total: 56, approved: 40, rejected: 6, pending: 7, processing: 1, other: 2 });
    const response = await report();
    const data = await response.json();
    expect(data.summary.triggeredLeads).toBe(2);
    expect(data.summary.legacyReportedSent).toBe(38);
    expect(data.data[0].stats).toMatchObject({ total: 5, sent: 2, delivered: 1, failed: 2, wrongNumber: 1, pending: 1 });
    expect(data.data[0].retryableCount).toBe(1);
    expect(jest.mocked(bunnyExecute).mock.calls.every(([statement]) => !String(typeof statement === 'string' ? statement : statement.sql).startsWith('UPDATE'))).toBe(true);
  });
  it('retries only a transient failed recipient and leaves sent and invalid-number rows unchanged', async () => {
    const response = await action('run', 'retry');
    expect(response.status).toBe(200);
    expect((await response.json()).affected).toBe(1);
    const rows = await client.execute('SELECT status FROM broadcast_run_messages_sql ORDER BY document_id');
    expect(rows.rows.map(row => row.status)).toEqual(['sent', 'delivered', 'pending', 'pending', 'failed']);
  });
  it('archives in the backend deleted folder without deleting recipient history', async () => {
    expect((await action('run', 'delete')).status).toBe(200);
    const rows = await client.execute('SELECT * FROM broadcast_run_messages_sql');
    expect(rows.rows).toHaveLength(5);
    const stored = await client.execute('SELECT status,data_json FROM broadcast_runs_sql');
    expect(stored.rows[0].status).toBe('cancelled');
    expect(JSON.parse(String(stored.rows[0].data_json))).toMatchObject({ reportFolder: 'deleted', reportDeletedBy: 'admincrm' });
    const data = await (await report()).json();
    expect(data.data).toEqual([]);
    expect(data.summary.triggeredLeads).toBe(2);
  });
  it('does not cancel or archive while a provider send is in flight', async () => {
    await client.execute("UPDATE broadcast_run_messages_sql SET status='sending' WHERE document_id='message-3'");
    expect((await action('run', 'delete')).status).toBe(409);
    expect((await client.execute('SELECT status FROM broadcast_runs_sql')).rows[0].status).toBe('scheduled');
  });
  it('validates future schedules and reschedules unsent recipients only', async () => {
    expect((await action('run', 'reschedule', '2020-01-01T00:00:00Z')).status).toBe(400);
    const future = new Date(Date.now() + 3600000).toISOString();
    expect((await action('run', 'reschedule', future)).status).toBe(200);
    expect((await client.execute('SELECT scheduled_at FROM broadcast_runs_sql')).rows[0].scheduled_at).toBe(future);
    expect((await client.execute("SELECT status FROM broadcast_run_messages_sql WHERE document_id='message-0'")).rows[0].status).toBe('sent');
  });
  it('refuses another tenant’s run and excludes unrelated runs from the batch report', async () => {
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'tenant', superAdmin: false });
    expect((await action('run', 'retry')).status).toBe(404);
    expect((await (await report()).json()).data).toEqual([]);
  });
});
