/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
jest.mock('@/lib/bunnyContactIdentity', () => ({ persistBunnyContact: jest.fn() }));

describe('Form schema migration across concurrent serverless instances', () => {
  beforeEach(() => jest.resetModules());

  it('accepts a concurrent column migration only after verifying the actual column', async () => {
    const { bunnyExecute, bunnyBatch } = await import('@/lib/bunnyDatabase');
    const { ensureFormTables } = await import('@/lib/bunny-forms-db');
    let migrated = false;
    jest.mocked(bunnyBatch).mockResolvedValue([]);
    jest.mocked(bunnyExecute).mockImplementation(async statement => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      if (sql.includes('ALTER TABLE form_submissions ADD COLUMN lead_id')) {
        migrated = true;
        throw new Error('SQLite error: duplicate column name: lead_id');
      }
      return { rows: sql.includes('enquiry_forms') ? [{ name: 'url_image' }] :
        ['form_data', 'source', 'raw_answers', ...(migrated ? ['lead_id'] : [])].map(name => ({ name })) } as never;
    });
    await Promise.all([ensureFormTables(), ensureFormTables(), ensureFormTables()]);
    expect(migrated).toBe(true);
    expect(bunnyBatch).toHaveBeenCalledTimes(1);
  });

  it('does not conceal a failed migration when the required column remains absent', async () => {
    const { bunnyExecute, bunnyBatch } = await import('@/lib/bunnyDatabase');
    const { ensureFormTables } = await import('@/lib/bunny-forms-db');
    jest.mocked(bunnyBatch).mockResolvedValue([]);
    jest.mocked(bunnyExecute).mockImplementation(async statement => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      if (sql.includes('ALTER TABLE')) throw new Error('Database write denied');
      if (sql.startsWith('SELECT lead_id')) throw new Error('no such column: lead_id');
      return { rows: sql.includes('enquiry_forms') ? [{ name: 'url_image' }] :
        ['form_data', 'source', 'raw_answers'].map(name => ({ name })) } as never;
    });
    await expect(ensureFormTables()).rejects.toThrow('Database write denied');
    await expect(ensureFormTables()).rejects.toThrow('Database write denied');
    expect(bunnyBatch).toHaveBeenCalledTimes(2);
  });

  it('verifies column resolution when remote schema metadata remains stale', async () => {
    const { bunnyExecute, bunnyBatch } = await import('@/lib/bunnyDatabase');
    const { ensureFormTables } = await import('@/lib/bunny-forms-db');
    jest.mocked(bunnyBatch).mockResolvedValue([]);
    jest.mocked(bunnyExecute).mockImplementation(async statement => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      if (sql.includes('ALTER TABLE')) throw new Error('duplicate column name: lead_id');
      if (sql.startsWith('SELECT lead_id')) return { rows: [] } as never;
      return { rows: sql.includes('enquiry_forms') ? [{ name: 'url_image' }] :
        ['form_data', 'source', 'raw_answers'].map(name => ({ name })) } as never;
    });
    await ensureFormTables();
    expect(bunnyExecute).toHaveBeenCalledWith('SELECT lead_id FROM form_submissions LIMIT 0');
  });
});
