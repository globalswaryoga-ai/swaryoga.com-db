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
  console.log("Zoom Token acquired!");

  const meetings = [
    { name: 'Marathi Swar yoga L1', id: '84612021311' },
    { name: 'Hindi Swar Yoga L-1 Sep 26', id: '85155446286' },
    { name: 'English Followup Session-Sep 26', id: '89327257836' },
  ];

  for (const m of meetings) {
    console.log(`\n=== Checking Zoom Recordings for: ${m.name} (${m.id}) ===`);
    
    // 1. Check active recordings
    try {
      const activeRes = await fetch(`https://api.zoom.us/v2/meetings/${m.id}/recordings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activeData = await activeRes.json();
      if (activeRes.ok) {
        console.log(`[ACTIVE] Topic: ${activeData.topic} | Start: ${activeData.start_time} | Files: ${activeData.recording_files?.length || 0}`);
        (activeData.recording_files || []).forEach(f => {
          console.log(`   - File: ${f.recording_type} (${f.file_type}) | Start: ${f.recording_start} | Download: ${f.download_url?.slice(0, 50)}...`);
        });
      } else {
        console.log(`[ACTIVE ERROR]: ${activeData.message || JSON.stringify(activeData)}`);
      }
    } catch (e) {
      console.log(`[ACTIVE EXCEPTION]: ${e.message}`);
    }

    // 2. Check user recordings list (me/recordings)
    try {
      const userRes = await fetch(`https://api.zoom.us/v2/users/me/recordings?from=2026-08-01&to=2026-10-01&page_size=300`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (userRes.ok && userData.meetings) {
        const matches = userData.meetings.filter(x => String(x.id) === m.id);
        console.log(`[USER LIST MATCHES]: ${matches.length} instances`);
        matches.forEach(x => {
          console.log(`   - Instance: UUID=${x.uuid} | Start=${x.start_time} | Files=${x.recording_files?.length}`);
        });
      }
    } catch (e) {
      console.log(`[USER LIST EXCEPTION]: ${e.message}`);
    }

    // 3. Check TRASH recordings
    try {
      const trashRes = await fetch(`https://api.zoom.us/v2/users/me/recordings?trash=true&from=2026-08-01&to=2026-10-01&page_size=300`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const trashData = await trashRes.json();
      if (trashRes.ok && trashData.meetings) {
        const trashedMatches = trashData.meetings.filter(x => String(x.id) === m.id);
        console.log(`[TRASH MATCHES]: ${trashedMatches.length} instances`);
        trashedMatches.forEach(x => {
          console.log(`   - Trashed Instance: UUID=${x.uuid} | Start=${x.start_time} | Files=${x.recording_files?.length}`);
        });
      }
    } catch (e) {
      console.log(`[TRASH EXCEPTION]: ${e.message}`);
    }
  }
}

run().catch(console.error);
