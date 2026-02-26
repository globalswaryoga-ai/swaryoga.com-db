/**
 * Bulk sync existing Zoom cloud recordings to Bunny Stream
 * Lists all recordings from Zoom, downloads and uploads to Bunny
 * 
 * Usage: node scripts/zoom-to-bunny-bulk.js [--dry-run] [--from 2024-01-01] [--to 2025-03-31]
 */

const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
require('dotenv').config({ path: '.env.local' });

const BUNNY_API_BASE = 'https://video.bunnycdn.com';
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const fromIdx = args.indexOf('--from');
const toIdx = args.indexOf('--to');
const FROM_DATE = fromIdx >= 0 ? args[fromIdx + 1] : '2024-01-01';
const TO_DATE = toIdx >= 0 ? args[toIdx + 1] : new Date().toISOString().split('T')[0];

async function getZoomToken() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  const creds = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    { method: 'POST', headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const data = await res.json();
  return data.access_token;
}

async function listZoomRecordings(token, from, to) {
  // Zoom API: list recordings for user
  const url = `https://api.zoom.us/v2/users/me/recordings?from=${from}&to=${to}&page_size=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom API error: ${res.status} ${err}`);
  }
  return res.json();
}

async function downloadRecording(url, token) {
  const res = await fetch(`${url}?access_token=${token}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToBunny(buffer, title) {
  // Create video
  const createRes = await fetch(`${BUNNY_API_BASE}/library/${BUNNY_LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: { 'AccessKey': BUNNY_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!createRes.ok) throw new Error(`Bunny create failed: ${createRes.status}`);
  const video = await createRes.json();

  // Upload
  const upRes = await fetch(`${BUNNY_API_BASE}/library/${BUNNY_LIBRARY_ID}/videos/${video.guid}`, {
    method: 'PUT',
    headers: { 'AccessKey': BUNNY_API_KEY, 'Content-Type': 'application/octet-stream' },
    body: buffer
  });
  if (!upRes.ok) throw new Error(`Bunny upload failed: ${upRes.status}`);

  return {
    videoId: video.guid,
    embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.guid}`
  };
}

(async () => {
  console.log(`=== Zoom → Bunny Stream Bulk Sync ===`);
  console.log(`Period: ${FROM_DATE} to ${TO_DATE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no uploads)' : 'LIVE'}\n`);

  if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
    console.error('Missing BUNNY_API_KEY or BUNNY_STREAM_LIBRARY_ID');
    process.exit(1);
  }

  const token = await getZoomToken();
  console.log('Zoom token obtained\n');

  // Zoom API only allows 30-day range, so we chunk
  const fromDate = new Date(FROM_DATE);
  const toDate = new Date(TO_DATE);
  let allMeetings = [];

  let chunkStart = new Date(fromDate);
  while (chunkStart < toDate) {
    let chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + 29);
    if (chunkEnd > toDate) chunkEnd = toDate;

    const fromStr = chunkStart.toISOString().split('T')[0];
    const toStr = chunkEnd.toISOString().split('T')[0];
    console.log(`Fetching ${fromStr} to ${toStr}...`);

    try {
      const data = await listZoomRecordings(token, fromStr, toStr);
      if (data.meetings) {
        allMeetings.push(...data.meetings);
        console.log(`  Found ${data.meetings.length} meetings`);
      }
    } catch (e) {
      console.warn(`  Error: ${e.message}`);
    }

    chunkStart.setDate(chunkStart.getDate() + 30);
  }

  console.log(`\nTotal meetings found: ${allMeetings.length}`);

  // Filter MP4 recordings (speaker/gallery view)
  const ALLOWED = ['speaker_view', 'gallery_view', 'shared_screen_with_speaker_view', 'shared_screen_with_gallery_view'];
  let totalFiles = 0;
  let totalSize = 0;
  let synced = 0;
  let errors = 0;

  for (const mtg of allMeetings) {
    const mp4Files = (mtg.recording_files || []).filter(
      f => ALLOWED.includes(f.recording_type) && (f.file_type === 'MP4' || f.file_extension === 'MP4')
    );

    if (mp4Files.length === 0) continue;

    console.log(`\n${mtg.topic} (${mtg.start_time})`);
    
    for (const file of mp4Files) {
      totalFiles++;
      const sizeMB = (file.file_size / 1024 / 1024).toFixed(1);
      totalSize += file.file_size;

      const date = new Date(file.recording_start).toISOString().split('T')[0];
      const title = `${mtg.topic} - ${file.recording_type.replace(/_/g, ' ')} - ${date}`;

      console.log(`  ${file.recording_type} | ${sizeMB} MB | ${title}`);

      if (DRY_RUN) continue;

      try {
        console.log(`    Downloading...`);
        const buffer = await downloadRecording(file.download_url, token);
        console.log(`    Uploading to Bunny Stream...`);
        const result = await uploadToBunny(buffer, title);
        console.log(`    ✅ ${result.embedUrl}`);
        synced++;
      } catch (e) {
        console.error(`    ❌ ${e.message}`);
        errors++;
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total video files: ${totalFiles}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
  if (!DRY_RUN) {
    console.log(`Synced to Bunny: ${synced}`);
    console.log(`Errors: ${errors}`);
  } else {
    console.log('(Dry run - no uploads performed)');
  }
})();
