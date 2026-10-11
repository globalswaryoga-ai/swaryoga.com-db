/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
import { createClient, type Client } from '@libsql/client';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { ensureBroadcastSchema, broadcastRunUpdateOne, broadcastRunMessageUpdateOne } from '@/lib/bunnyBroadcastRepository';

describe('Broadcast archive preservation and cancellation claims', () => {
  let client: Client;
  beforeAll(async () => {
    client = createClient({ url: 'file::memory:' });
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    await ensureBroadcastSchema();
  });
  afterAll(() => client.close());
  beforeEach(async () => {
    await client.execute('DELETE FROM broadcast_run_messages_sql');
    await client.execute('DELETE FROM broadcast_runs_sql');
    await client.execute({
      sql: `INSERT INTO broadcast_runs_sql(document_id,broadcast_run_key,name,created_by_user_id,status,data_json)
        VALUES ('run','run','Test','admincrm','cancelled',?)`,
      args: [JSON.stringify({ reportFolder: 'deleted', reportDeletedBy: 'admincrm', target: { registrationEventKey: 'batch:event' }, senderNumber: '919000000000' })],
    });
    await client.execute("INSERT INTO broadcast_run_messages_sql(document_id,run_id,phone_number,status) VALUES ('message','run','919000000000','pending')");
  });
  it('keeps the backend deleted folder and audit fields when stats update', async () => {
    await broadcastRunUpdateOne('run', { stats: { sent: 1 } });
    await broadcastRunUpdateOne('run', { status: 'scheduled' });
    const row = (await client.execute('SELECT status,data_json FROM broadcast_runs_sql')).rows[0];
    expect(row.status).toBe('cancelled');
    expect(JSON.parse(String(row.data_json))).toMatchObject({ reportFolder: 'deleted', reportDeletedBy: 'admincrm', senderNumber: '919000000000', stats: { sent: 1 } });
  });
  it('never claims a cancelled/deleted recipient and respects a future reschedule', async () => {
    expect(await broadcastRunMessageUpdateOne('message', { status: 'sending' })).toBe(false);
    await client.execute({
      sql: "UPDATE broadcast_runs_sql SET status='scheduled',data_json='{}',scheduled_at=?",
      args: [new Date(Date.now() + 3600000).toISOString()],
    });
    expect(await broadcastRunMessageUpdateOne('message', { status: 'sending' })).toBe(false);
    await client.execute("UPDATE broadcast_runs_sql SET scheduled_at='2020-01-01T00:00:00Z'");
    expect(await broadcastRunMessageUpdateOne('message', { status: 'sending' })).toBe(true);
    expect(await broadcastRunMessageUpdateOne('message', { status: 'sending' })).toBe(false);
  });
});
