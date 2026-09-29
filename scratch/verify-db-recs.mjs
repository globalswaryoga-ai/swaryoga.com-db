import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL.trim(),
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim(),
});

async function run() {
  const r = await client.execute("SELECT * FROM workshop_recordings_sql");
  console.log("=== RECORDINGS IN BUNNY DB ===");
  r.rows.forEach(row => {
    const meta = JSON.parse(String(row.metadata_json || '{}'));
    console.log(`Date: ${row.class_date} | Cohort: ${row.cohort_id} | Day: ${row.day_number} | YT: ${row.youtube_speaker_url || 'NONE'} | Bunny: ${row.bunny_speaker_url || 'NONE'} | ZoomShare: ${meta.zoomShareUrl || 'NONE'}`);
  });
}

run().catch(console.error);
