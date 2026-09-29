import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL.trim(),
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim(),
});

async function run() {
  const cohortsRes = await client.execute("SELECT * FROM workshop_cohorts_sql");
  console.log("=== ALL COHORTS ===");
  cohortsRes.rows.forEach((r) => {
    console.log(`ID: ${r.id} | Name: ${r.name} | Zoom Meeting ID: ${r.zoom_meeting_id} | Start: ${r.start_date} | TrashRecover: ${r.auto_recover_zoom_trash}`);
  });

  const recsRes = await client.execute("SELECT id, cohort_id, class_date, day_number, youtube_speaker_url, bunny_speaker_url FROM workshop_recordings_sql");
  console.log("\n=== ALL RECORDINGS ===");
  console.log(`Total Recordings in DB: ${recsRes.rows.length}`);
  recsRes.rows.forEach((r) => {
    console.log(`Cohort: ${r.cohort_id} | Day: ${r.day_number} | Date: ${r.class_date} | YT: ${r.youtube_speaker_url || 'NONE'} | Bunny: ${r.bunny_speaker_url || 'NONE'}`);
  });
}

run().catch(console.error);
