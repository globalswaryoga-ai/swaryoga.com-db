import fetch from 'node-fetch';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import crypto from 'crypto';
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
  console.log("=== STEP 1: Recovering All Trashed Recordings in Zoom ===");

  const trashRes = await fetch(`https://api.zoom.us/v2/users/me/recordings?trash=true&from=2026-08-01&to=2026-10-01&page_size=300`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const trashData = await trashRes.json();

  if (trashRes.ok && trashData.meetings) {
    console.log(`Found ${trashData.meetings.length} total trashed meeting instances in Zoom.`);
    for (const meeting of trashData.meetings) {
      if (!meeting.uuid) continue;
      let uuid = meeting.uuid;
      if (uuid.startsWith('/') || uuid.includes('//')) {
        uuid = encodeURIComponent(encodeURIComponent(uuid));
      } else {
        uuid = encodeURIComponent(uuid);
      }

      console.log(`Recovering Zoom recording: Topic="${meeting.topic}" | Date=${meeting.start_time} | UUID=${meeting.uuid}...`);
      try {
        const recRes = await fetch(`https://api.zoom.us/v2/meetings/${uuid}/recordings/status`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'recover' }),
        });
        if (recRes.ok) {
          console.log(`  ✅ Successfully recovered ${meeting.uuid}`);
        } else {
          const errText = await recRes.text();
          console.log(`  ⚠️ Recovery status ${recRes.status}: ${errText}`);
        }
      } catch (err) {
        console.error(`  ❌ Error recovering ${meeting.uuid}:`, err.message);
      }
    }
  }

  console.log("\n=== STEP 2: Enabling Auto-Recover Zoom Trash for All Cohorts ===");
  await client.execute("UPDATE workshop_cohorts_sql SET auto_recover_zoom_trash = 1");
  console.log("Updated auto_recover_zoom_trash = 1 for all workshop cohorts!");

  console.log("\n=== STEP 3: Complete! All trashed Zoom recordings recovered ===");
}

run().catch(console.error);
