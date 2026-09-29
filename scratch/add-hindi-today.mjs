import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL.trim(),
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim(),
});

async function run() {
  const cohortId = '816f57f7-5dcd-4056-acee-361280ad5bef'; // Hindi Swar Yoga L-1 Sep 26
  const zoomMeetingId = '85155446286';
  const zoomUuid = 'vuJKJ22TQpmKKShuEtrL4Q==';
  const dateStr = '2026-09-29';
  const dayNumber = 14; // Day 14 for Hindi batch

  const id = crypto.randomUUID();
  const metadata = {
    zoomSpeakerUrl: 'https://us06web.zoom.us/rec/download/6dCfdeVL58SQt2DOvNfbsTA...',
    zoomGalleryUrl: 'https://us06web.zoom.us/rec/download/Mozl81sfMvPosW2kJs4v23w...',
    lastZoomSyncAt: new Date().toISOString(),
  };

  console.log("Adding today's (Sep 29) Hindi Swar Yoga recording to database...");

  await client.execute({
    sql: `INSERT INTO workshop_recordings_sql (
        id, cohort_id, class_date, day_number, zoom_meeting_id, zoom_meeting_uuid,
        delivered_student_ids_json, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        day_number = excluded.day_number,
        zoom_meeting_id = excluded.zoom_meeting_id,
        zoom_meeting_uuid = excluded.zoom_meeting_uuid,
        metadata_json = excluded.metadata_json,
        updated_at = CURRENT_TIMESTAMP`,
    args: [id, cohortId, dateStr, dayNumber, zoomMeetingId, zoomUuid, JSON.stringify(metadata)]
  });

  console.log("Successfully added today's Hindi recording to workshop_recordings_sql!");
}

run().catch(console.error);
