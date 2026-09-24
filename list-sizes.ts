import { config } from 'dotenv';
config({ path: '.env.local' });
import fetch from 'node-fetch';

const API_KEY = process.env.BUNNY_STORAGE_KEY;
const ZONE = process.env.BUNNY_STORAGE_ZONE_BACKUP || 'backupmobgo';

async function listFiles(path: string) {
  const url = `https://storage.bunnycdn.com/${ZONE}${path}/`;
  const res = await fetch(url, { headers: { AccessKey: API_KEY!, accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  data.sort((a: any, b: any) => b.Length - a.Length);
  data.slice(0, 15).forEach((file: any) => {
    console.log(`${file.ObjectName} - ${(file.Length / 1024 / 1024).toFixed(2)} MB`);
  });
}

listFiles('/sql/latest').catch(console.error);
