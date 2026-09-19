import { config } from 'dotenv';
config({ path: '.env.local' });

import fetch from 'node-fetch';
import { bunnyExecute, bunnyBatch } from '../lib/bunnyDatabase';

const API_KEY = process.env.BUNNY_STORAGE_KEY;
const ZONE = process.env.BUNNY_STORAGE_ZONE_BACKUP || 'backupmobgo';

async function fetchJson(urlPath: string) {
  const url = `https://storage.bunnycdn.com/${ZONE}${urlPath}`;
  const res = await fetch(url, { headers: { AccessKey: API_KEY!, accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function restoreTable(tableName: string) {
  console.log(`\n--- Restoring ${tableName} ---`);
  try {
    const data = await fetchJson(`/sql/latest/${tableName}.json`);
    if (!data || !Array.isArray(data)) {
      console.log(`No data found for ${tableName}`);
      return;
    }
    
    console.log(`Fetched ${data.length} records for ${tableName}. Restoring...`);
    
    if (data.length === 0) return;
    
    // The data is an array of objects. We need to construct an INSERT statement.
    const keys = Object.keys(data[0]);
    
    // Construct bulk insert using bunnyBatch
    const batchOps = data.map((row: any) => {
      const values = keys.map(k => {
        const val = row[k];
        return val !== undefined && val !== null ? String(val) : null;
      });
      return {
        sql: `INSERT OR REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        args: values
      };
    });
    
    // Execute in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < batchOps.length; i += chunkSize) {
      const chunk = batchOps.slice(i, i + chunkSize);
      await bunnyBatch(chunk);
      console.log(`Inserted ${Math.min(i + chunkSize, batchOps.length)}/${batchOps.length}`);
    }
    
    console.log(`✅ Fully restored ${tableName}`);
  } catch (error: any) {
    console.error(`❌ Failed to restore ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('Starting data restoration from Bunny CDN...');
  
  const tables = [
    'leads_sql',
    'community_members_sql',
    'community_posts_sql',
    'whatsapp_templates_sql',
    'admin_users_sql',
    'social_inbox_conversations_sql',
    'tenant_setup_sql',
    'user_compartments_sql'
  ];
  
  for (const table of tables) {
    await restoreTable(table);
  }
  
  console.log('\nData restoration complete!');
}

main().catch(console.error);
