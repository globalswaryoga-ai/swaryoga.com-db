import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

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

  const trashRes = await fetch(`https://api.zoom.us/v2/users/me/recordings?trash=true&from=2026-08-01&to=2026-10-01&page_size=300`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const trashData = await trashRes.json();

  console.log(`Found ${trashData.meetings?.length || 0} trashed meetings.`);
  for (const m of (trashData.meetings || []).slice(0, 5)) {
    console.log(`\nMeeting: ${m.topic} (${m.id}) | Date: ${m.start_time}`);
    let uuid = m.uuid;
    if (uuid.startsWith('/') || uuid.includes('//')) {
      uuid = encodeURIComponent(encodeURIComponent(uuid));
    } else {
      uuid = encodeURIComponent(uuid);
    }
    const recRes = await fetch(`https://api.zoom.us/v2/meetings/${uuid}/recordings?trash=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const recData = await recRes.json();
    console.log(`  Rec Files count: ${recData.recording_files?.length || 0}`);
    (recData.recording_files || []).forEach(f => {
      console.log(`   - File: ${f.recording_type} | Ext: ${f.file_extension} | Download: ${f.download_url}`);
    });
  }
}

run().catch(console.error);
