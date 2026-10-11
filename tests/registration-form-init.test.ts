/** @jest-environment node */

jest.mock('@/lib/bunnyDatabase', () => ({ bunnyBatch: jest.fn(), bunnyExecute: jest.fn() }));

describe('Registration form schema initialization', () => {
  beforeEach(() => jest.resetModules());

  it('shares initialization across simultaneous form and submission reads', async () => {
    const db = require('@/lib/bunnyDatabase');
    const { ensureFormTables } = require('@/lib/bunny-forms-db');
    db.bunnyBatch.mockResolvedValue([]);
    db.bunnyExecute.mockResolvedValue({ rows: [] });
    await Promise.all([ensureFormTables(), ensureFormTables(), ensureFormTables()]);
    expect(db.bunnyBatch).toHaveBeenCalledTimes(1);
    await ensureFormTables();
    expect(db.bunnyBatch).toHaveBeenCalledTimes(1);
  });

  it('allows retry after a failed initialization without returning success', async () => {
    const db = require('@/lib/bunnyDatabase');
    const { ensureFormTables } = require('@/lib/bunny-forms-db');
    db.bunnyBatch.mockRejectedValueOnce(new Error('SQL unavailable')).mockResolvedValue([]);
    db.bunnyExecute.mockResolvedValue({ rows: [] });
    await expect(ensureFormTables()).rejects.toThrow('SQL unavailable');
    await ensureFormTables();
    expect(db.bunnyBatch).toHaveBeenCalledTimes(2);
  });
});
