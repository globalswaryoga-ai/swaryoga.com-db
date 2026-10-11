/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyExecute: jest.fn(), bunnyBatch: jest.fn(), cleanMongoJson: (value: unknown) => value,
}));
import { createClient, Client } from '@libsql/client';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { listBunnyAutomationRules, saveBunnyAutomationRule, deleteBunnyAutomationRule } from '@/lib/bunnyAutomationRepository';

describe('Bunny automation rule persistence', () => {
  let client: Client;
  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    await client.execute('CREATE TABLE mongo_documents(document_id TEXT,collection_name TEXT,document_json TEXT)');
  });
  afterEach(() => client.close());
  it('keeps tenant rules isolated and does not enable new rules implicitly', async () => {
    const rule = await saveBunnyAutomationRule({ name: 'Recording', actionType: 'send_text', actionText: 'Hello', keywords: ['recording'] }, 'tenant');
    expect(rule.enabled).toBe(false);
    expect(await listBunnyAutomationRules('admincrm')).toHaveLength(0);
    expect(await listBunnyAutomationRules('tenant')).toHaveLength(1);
    expect(await deleteBunnyAutomationRule(rule._id, 'other')).toBe(0);
  });
  it('restores archived rules without Mongo access and does not resurrect deleted rules', async () => {
    await client.execute({ sql: 'INSERT INTO mongo_documents VALUES (?,?,?)', args: ['old', 'whatsapp_automation_rules',
      JSON.stringify({ _id: 'old', name: 'Welcome', createdByUserId: 'admincrm', enabled: true, triggerType: 'welcome', actionType: 'send_text' })] });
    expect(await listBunnyAutomationRules('admincrm')).toHaveLength(1);
    await deleteBunnyAutomationRule('old', 'admincrm');
    expect(await listBunnyAutomationRules('admincrm')).toHaveLength(0);
  });
  it('rejects malformed keyword and throttle values explicitly', async () => {
    await expect(saveBunnyAutomationRule({ name: 'Bad', actionType: 'send_text', keywords: [''] }, 'tenant')).rejects.toThrow('Keywords');
    await expect(saveBunnyAutomationRule({ name: 'Bad', actionType: 'send_text', throttleMinutesPerLead: -1 }, 'tenant')).rejects.toThrow('Invalid');
  });
});
