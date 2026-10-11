/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyBatch: jest.fn(), bunnyExecute: jest.fn() }));

describe.each([
  ['@/lib/bunnyMetaWhatsAppRepository', 'initBunnyMetaWhatsAppSchema'],
  ['@/lib/bunnyWhatsAppAccounts', 'initBunnyWhatsAppAccountsSchema'],
  ['@/lib/bunnyBroadcastRepository', 'ensureBroadcastSchema'],
])('Single-flight Meta schema: %s', (modulePath, functionName) => {
  beforeEach(() => jest.resetModules());
  it('shares initialization across repeated and concurrent calls', async () => {
    const db = require('@/lib/bunnyDatabase');
    db.bunnyBatch.mockResolvedValue([]);
    db.bunnyExecute.mockResolvedValue({ rows: [] });
    const initialize = require(modulePath)[functionName];
    await Promise.all([initialize(), initialize(), initialize()]);
    await initialize();
    expect(db.bunnyBatch).toHaveBeenCalledTimes(1);
  });
  it('propagates failure and allows a later retry', async () => {
    const db = require('@/lib/bunnyDatabase');
    db.bunnyBatch.mockRejectedValueOnce(new Error('SQL unavailable')).mockResolvedValue([]);
    db.bunnyExecute.mockResolvedValue({ rows: [] });
    const initialize = require(modulePath)[functionName];
    await expect(initialize()).rejects.toThrow('SQL unavailable');
    await initialize();
    expect(db.bunnyBatch).toHaveBeenCalledTimes(2);
  });
});

it('stores the indexed sender owner alongside Meta message JSON', async () => {
  jest.resetModules();
  const db = require('@/lib/bunnyDatabase');
  db.bunnyBatch.mockResolvedValue([]);
  db.bunnyExecute.mockResolvedValue({ rows: [] });
  const { upsertBunnyMetaMessage } = require('@/lib/bunnyMetaWhatsAppRepository');
  await upsertBunnyMetaMessage({ documentId: 'message', phoneNumber: '919999999999', sentByUserId: 'tenant', status: 'sent' });
  const insert = db.bunnyExecute.mock.calls.find(([statement]: [{ sql: string }]) => statement.sql.startsWith('INSERT INTO meta_messages_sql'))[0];
  expect(insert.sql).toContain('sent_by_user_id');
  expect(insert.args[9]).toBe('tenant');
  expect(JSON.parse(insert.args[13])).toMatchObject({ sentByUserId: 'tenant', status: 'sent' });
});
