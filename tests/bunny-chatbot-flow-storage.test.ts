/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
import { createClient, Client } from '@libsql/client';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { saveBunnyChatbotFlow, listBunnyChatbotFlows, getBunnyChatbotFlow, deleteBunnyChatbotFlow } from '@/lib/bunnyChatbotRepository';

describe('Authoritative Bunny chatbot flow storage', () => {
  let client: Client;
  beforeEach(() => {
    client = createClient({ url: 'file::memory:' });
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
  });
  afterEach(() => client.close());
  it('preserves canvas, node branches and keywords exactly across save/load', async () => {
    const input = { name: 'Welcome', enabled: false, triggerKeywords: ['join'],
      nodes: [{ nodeId: 'first', type: 'question', options: [{ label: 'Yes', value: 'yes', nextNodeId: 'end' }] }, { nodeId: 'end', type: 'end' }],
      startNodeId: 'first', metadata: { canvas: { blocks: [{ id: 'first', x: 10, y: 20 }], connections: [{ fromId: 'first', toId: 'end', optionIndex: 0 }] } } };
    const saved = await saveBunnyChatbotFlow(input, 'tenant');
    expect(await getBunnyChatbotFlow(saved!._id, 'tenant')).toEqual(expect.objectContaining(input));
  });
  it('does not show shared flows to tenants or allow another tenant to mutate/delete', async () => {
    const saved = await saveBunnyChatbotFlow({ name: 'Private', enabled: true }, 'tenant');
    await saveBunnyChatbotFlow({ name: 'Shared' }, 'admincrm');
    expect((await listBunnyChatbotFlows('tenant')).total).toBe(1);
    expect(await getBunnyChatbotFlow(saved!._id, 'other')).toBeNull();
    await expect(saveBunnyChatbotFlow({ name: 'Hijacked' }, 'other', saved!._id)).rejects.toThrow('another account');
    expect(await deleteBunnyChatbotFlow(saved!._id, 'other')).toBe(0);
    expect((await listBunnyChatbotFlows('admincrm')).total).toBe(2);
  });
  it('does not change a tenant flow owner when edited by Super Admin', async () => {
    const saved = await saveBunnyChatbotFlow({ name: 'Private' }, 'tenant');
    const edited = await saveBunnyChatbotFlow({ name: 'Updated' }, 'admincrm', saved!._id);
    expect(edited!.createdByUserId).toBe('tenant');
  });
  it('surfaces unavailable SQL instead of returning successful empty data', async () => {
    jest.mocked(bunnyBatch).mockRejectedValueOnce(new Error('Bunny unavailable'));
    await expect(listBunnyChatbotFlows('tenant')).rejects.toThrow('Bunny unavailable');
  });
});
