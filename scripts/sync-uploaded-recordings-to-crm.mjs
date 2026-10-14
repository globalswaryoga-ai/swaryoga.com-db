#!/usr/bin/env node
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const dbUrl = process.env.BUNNY_DATABASE_URL?.trim();
const dbToken = process.env.BUNNY_DATABASE_AUTH_TOKEN?.trim();

if (!dbUrl || !dbToken) {
  console.error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required.');
  process.exit(1);
}

const client = createClient({ url: dbUrl, authToken: dbToken });
const bunnyCdn = (path) => path ? (path.startsWith('http') ? path : 'https://swaryogacrm.b-cdn.net/' + path.replace(/^\/+/, '')) : null;

export async function syncUploadedMeetingsToRecordings() {
  console.log('[Sync Uploaded] Starting sync from social_media_accounts_sql to workshop_recordings_sql...');
  
  const sm = await client.execute("SELECT document_id, data_json FROM social_media_accounts_sql WHERE platform = 'youtube' AND is_connected = 1");
  const data = JSON.parse(sm.rows[0]?.data_json || '{}');
  const uploaded = data.metadata?.uploadedMeetings || data.uploadedMeetings || [];
  console.log(`[Sync Uploaded] Found ${uploaded.length} uploaded meetings`);

  const cohortsRes = await client.execute('SELECT id, name, zoom_meeting_id, timezone, start_date, holiday_dates_json FROM workshop_cohorts_sql');
  const cohorts = cohortsRes.rows;

  let updatedCount = 0;

  for (const m of uploaded) {
    const meetingDigits = String(m.zoomMeetingId || '').replace(/\D+/g, '');
    const matched = cohorts.filter(c => String(c.zoom_meeting_id || '').replace(/\D+/g, '') === meetingDigits);
    
    for (const c of matched) {
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: c.timezone || 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(m.startTime));

      const ytSpeaker = m.youtubeUrls?.speaker || (m.youtube?.speaker ? `https://youtu.be/${m.youtube.speaker}` : null);
      const ytGallery = m.youtubeUrls?.gallery || (m.youtube?.gallery ? `https://youtu.be/${m.youtube.gallery}` : null);
      const ytSpeakerId = m.youtube?.speaker || null;
      const ytGalleryId = m.youtube?.gallery || null;
      const bunnySpeaker = m.bunny?.speaker ? bunnyCdn(m.bunny.speaker) : null;
      const bunnyGallery = m.bunny?.gallery ? bunnyCdn(m.bunny.gallery) : null;

      // Check existing recording
      const existing = await client.execute({
        sql: 'SELECT id, day_number, youtube_speaker_url, bunny_speaker_url FROM workshop_recordings_sql WHERE cohort_id = ? AND class_date = ?',
        args: [c.id, dateStr]
      });

      if (existing.rows.length) {
        const row = existing.rows[0];
        await client.execute({
          sql: `UPDATE workshop_recordings_sql SET
            youtube_speaker_url = COALESCE(?, youtube_speaker_url),
            youtube_speaker_id = COALESCE(?, youtube_speaker_id),
            youtube_gallery_url = COALESCE(?, youtube_gallery_url),
            youtube_gallery_id = COALESCE(?, youtube_gallery_id),
            bunny_speaker_url = COALESCE(?, bunny_speaker_url),
            bunny_gallery_url = COALESCE(?, bunny_gallery_url),
            zoom_meeting_uuid = COALESCE(?, zoom_meeting_uuid),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          args: [ytSpeaker, ytSpeakerId, ytGallery, ytGalleryId, bunnySpeaker, bunnyGallery, m.uuid, row.id]
        });
        console.log(`[Sync Uploaded] Updated recording for ${c.name} (${dateStr}): ytSpeaker=${ytSpeaker}`);
        updatedCount++;
      } else {
        const newId = crypto.randomUUID();
        const start = new Date(c.start_date || dateStr);
        const current = new Date(dateStr);
        const dayNum = Math.max(1, Math.floor((current.getTime() - start.getTime()) / 86400000) + 1);

        await client.execute({
          sql: `INSERT INTO workshop_recordings_sql (
            id, cohort_id, class_date, day_number, zoom_meeting_id, zoom_meeting_uuid,
            youtube_speaker_id, youtube_gallery_id, youtube_speaker_url, youtube_gallery_url,
            bunny_speaker_url, bunny_gallery_url, delivered_student_ids_json, metadata_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [newId, c.id, dateStr, dayNum, m.zoomMeetingId, m.uuid, ytSpeakerId, ytGalleryId, ytSpeaker, ytGallery, bunnySpeaker, bunnyGallery]
        });
        console.log(`[Sync Uploaded] Created recording for ${c.name} (${dateStr}, Day ${dayNum}): ytSpeaker=${ytSpeaker}`);
        updatedCount++;
      }
    }
  }

  console.log(`[Sync Uploaded] Finished. Processed ${updatedCount} recording updates/creations.`);
  return updatedCount;
}

if (process.argv[1]?.endsWith('sync-uploaded-recordings-to-crm.mjs')) {
  syncUploadedMeetingsToRecordings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Sync Uploaded] Error:', err);
      process.exit(1);
    });
}
