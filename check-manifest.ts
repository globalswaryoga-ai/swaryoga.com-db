import { config } from 'dotenv';
config({ path: '.env.local' });
import fetch from 'node-fetch';

const API_KEY = process.env.BUNNY_STORAGE_KEY;
const ZONE = process.env.BUNNY_STORAGE_ZONE_BACKUP || 'backupmobgo';

async function checkManifest() {
  const url = `https://storage.bunnycdn.com/${ZONE}/sql/latest/meta_archive_manifest_sql.json`;
  const res = await fetch(url, { headers: { AccessKey: API_KEY!, accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  console.log(`Found ${data.length} records.`);
  if (data.length > 0) {
    console.log(data[0]);
    console.log(data[data.length - 1]);
  }
}

checkManifest().catch(console.error);
