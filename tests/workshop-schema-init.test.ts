/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyBatch: jest.fn(), bunnyExecute: jest.fn() }));
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { initWorkshopBunnySchema } from '@/lib/workshopBunnyRepository';

it('retries failed initialization, then shares one schema initialization across reads and writes', async () => {
  jest.mocked(bunnyBatch).mockRejectedValueOnce(new Error('Database unavailable')).mockResolvedValue([]);
  jest.mocked(bunnyExecute).mockRejectedValue(new Error('duplicate column name: existing'));
  await expect(initWorkshopBunnySchema()).rejects.toThrow('Database unavailable');
  await Promise.all([initWorkshopBunnySchema(), initWorkshopBunnySchema(), initWorkshopBunnySchema()]);
  await initWorkshopBunnySchema();
  expect(bunnyBatch).toHaveBeenCalledTimes(2);
  expect(bunnyExecute).toHaveBeenCalledTimes(3);
});
