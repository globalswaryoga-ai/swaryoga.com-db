import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL.trim(),
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim(),
});

async function run() {
  const { syncZoomRecordingsForCohort } = await import('../lib/workshopRecordingSync.js').catch(async () => {
    // If TS module, we can run via node runner or direct SQL update
    return {};
  });

  const cohorts = await client.execute("SELECT * FROM workshop_cohorts_sql");
  for (const row of cohorts.rows) {
    console.log(`Cohort: "${row.name}" | ID: ${row.id} | Zoom: ${row.zoom_meeting_id}`);
  }

  // Check recordings for 2026-09-29
  const recs = await client.execute("SELECT * FROM workshop_recordings_sql WHERE class_date = '2026-09-29'");
  console.log("\n=== 2026-09-29 RECORDINGS IN DB ===");
  recs.rows.forEach(r => {
    console.log(`ID: ${r.id} | Cohort: ${r.cohort_id} | Day: ${r.day_number} | Date: ${r.class_date} | YT: ${r.youtube_speaker_url || 'NONE'} | Bunny: ${r.bunny_speaker_url || 'NONE'}`);
  });
}

run().catch(console.error);
