import { config } from 'dotenv';
config({ path: '.env.local' });
import fetch from 'node-fetch';

const API_KEY = process.env.BUNNY_STORAGE_KEY;
const ZONE = process.env.BUNNY_STORAGE_ZONE_BACKUP || 'backupmobgo';

async function checkWebhookEvents() {
  const url = `https://storage.bunnycdn.com/${ZONE}/sql/latest/meta_webhook_events_sql.json`;
  const res = await fetch(url, { headers: { AccessKey: API_KEY!, accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  console.log(`Found ${data.length} events.`);
  if (data.length > 0) {
    const dates = data.map((d: any) => new Date(d.created_at).getTime());
    dates.sort();
    console.log(`Oldest: ${new Date(dates[0]).toISOString()}`);
    console.log(`Newest: ${new Date(dates[dates.length-1]).toISOString()}`);
    const aug = dates.filter((d: number) => new Date(d).getMonth() === 7);
    const sep = dates.filter((d: number) => new Date(d).getMonth() === 8);
    console.log(`Aug events: ${aug.length}, Sep events: ${sep.length}`);
  }
}

checkWebhookEvents().catch(console.error);
