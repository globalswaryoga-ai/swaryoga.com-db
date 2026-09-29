import fetch from 'node-fetch';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL.trim(),
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim(),
});

async function getZoomToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  return data.access_token;
}

async function run() {
  const token = await getZoomToken();

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  console.log(`Checking Zoom recordings between ${yesterdayStr} and ${tomorrowStr}...`);

  const res = await fetch(`https://api.zoom.us/v2/users/me/recordings?from=${yesterdayStr}&to=${tomorrowStr}&page_size=300`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  console.log(`Found ${data.meetings?.length || 0} meeting recordings for today / recent 24h:`);
  (data.meetings || []).forEach(m => {
    console.log(`\nTopic: "${m.topic}" | Meeting ID: ${m.id} | Start: ${m.start_time} | UUID: ${m.uuid}`);
    (m.recording_files || []).forEach(f => {
      console.log(`   - File: ${f.recording_type} (${f.file_type}) | Size: ${(f.file_size / 1024 / 1024).toFixed(1)}MB | Download: ${f.download_url?.slice(0, 60)}...`);
    });
  });
}

run().catch(console.error);
