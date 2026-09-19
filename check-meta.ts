import { config } from 'dotenv';
config({ path: '.env.local' });
import fetch from 'node-fetch';

const API_KEY = process.env.BUNNY_STORAGE_KEY;
const ZONE = process.env.BUNNY_STORAGE_ZONE_BACKUP || 'backupmobgo';

async function checkMessages() {
  const url = `https://storage.bunnycdn.com/${ZONE}/sql/latest/meta_messages_sql.json`;
  const res = await fetch(url, { headers: { AccessKey: API_KEY!, accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  console.log(`Found ${data.length} messages.`);
  if (data.length > 0) {
    const dates = data.map((d: any) => new Date(d.created_at || JSON.parse(d.data_json).createdAt).getTime());
    dates.sort();
    console.log(`Oldest: ${new Date(dates[0]).toISOString()}`);
    console.log(`Newest: ${new Date(dates[dates.length-1]).toISOString()}`);
    
    const aug = dates.filter((d: number) => new Date(d).getMonth() === 7);
    const sep = dates.filter((d: number) => new Date(d).getMonth() === 8);
    console.log(`Aug messages: ${aug.length}, Sep messages: ${sep.length}`);
  }
}

checkMessages().catch(console.error);
