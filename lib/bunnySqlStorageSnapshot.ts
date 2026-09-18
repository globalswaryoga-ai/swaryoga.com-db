import { bunnyExecute } from '@/lib/bunnyDatabase';
import { BunnyStorageClient } from '@/lib/backup/bunny-client';

const INTERNAL_TABLES = new Set(['sqlite_sequence', '__bunny_migrations']);

export async function snapshotBunnySqlToStorage() {
  const key = process.env.BUNNY_STORAGE_KEY || process.env.BUNNY_STORAGE_API_KEY;
  if (!key) throw new Error('BUNNY_STORAGE_KEY or BUNNY_STORAGE_API_KEY is required');
  const storage = new BunnyStorageClient(key, process.env.BUNNY_STORAGE_ZONE_BACKUP || process.env.BUNNY_STORAGE_ZONE);
  const date = new Date().toISOString().slice(0, 10);
  const tablesResult = await bunnyExecute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  const tables = tablesResult.rows.map((row: any) => String(row.name)).filter((name) => !INTERNAL_TABLES.has(name));
  const results: Array<{ table: string; rows: number; status: string; error?: string }> = [];
  let totalBytes = 0;

  for (const table of tables) {
    try {
      const result = await bunnyExecute(`SELECT * FROM "${table.replace(/"/g, '""')}"`);
      const buffer = Buffer.from(JSON.stringify(result.rows));
      await storage.upload(`/sql/latest/${table}.json`, buffer);
      await storage.upload(`/sql/history/${date}/${table}.json`, buffer);
      totalBytes += buffer.length;
      results.push({ table, rows: result.rows.length, status: 'success' });
    } catch (error: any) {
      results.push({ table, rows: 0, status: 'error', error: error?.message || String(error) });
    }
  }

  const manifest = Buffer.from(JSON.stringify({ date, generatedAt: new Date().toISOString(), tables: results, totalBytes }));
  await storage.upload('/sql/latest/manifest.json', manifest);
  await storage.upload(`/sql/history/${date}/manifest.json`, manifest);
  return { date, totalBytes, results };
}
