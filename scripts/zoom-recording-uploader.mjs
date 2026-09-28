#!/usr/bin/env node
/**
 * Zoom recording → YouTube (+ Bunny) auto-uploader.
 *
 * Rule:
 *   • YouTube (Unlisted): Speaker view + Gallery view.
 *       - Prefer the WITH-screen version when the class shared a screen, else plain.
 *   • Bunny Storage: Speaker view + Gallery view, saved as exactly two MP4 files
 *     under the `zoom-videos/` folder of the storage zone.
 *
 * Idempotent: tracks done meetings stored in Bunny Database (LibSQL), keyed by
 * the Zoom meeting UUID, so it never re-uploads. Safe to run as often as you like.
 *
 * Designed to run on the bridge server (Node, big files OK) via cron — NOT Vercel.
 *
 * Required env:
 *   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_USER_EMAIL (host)
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN (optional; otherwise uses the admin YouTube connection)
 *   BUNNY_DATABASE_URL, BUNNY_DATABASE_AUTH_TOKEN
 *   ENCRYPTION_KEY   (same key prod used to encrypt the YouTube refresh token)
 *   BUNNY_ZOOM_STORAGE_ZONE (default swaryogadb), BUNNY_ZOOM_STORAGE_KEY
 *   RECORDING_LOOKBACK_DAYS (default 2)
 *   RECORDING_MIN_AGE_MINUTES (default 10; gives Zoom time to finish processing)
 *   ZOOM_MEETING_ID (optional; process only one meeting for a one-time run)
 *
 * Env is auto-loaded from .env.zoom-uploader next to the repo root (if present).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

import dotenv from 'dotenv';

// Load env from .env.zoom-uploader, .env.local, or .env at repo root
for (const envName of ['.env.zoom-uploader', '.env.local', '.env']) {
  try {
    const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', envName);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  } catch { /* ignore missing env file */ }
}

const log = (...a) => console.log(new Date().toISOString(), ...a);
const LOOKBACK = Number(process.env.RECORDING_LOOKBACK_DAYS || 2);
const MIN_AGE_MINUTES = Number(process.env.RECORDING_MIN_AGE_MINUTES || 10);
const TARGET_MEETING_ID = String(process.env.ZOOM_MEETING_ID || '').trim();

function decrypt(enc) {
  const k = process.env.ENCRYPTION_KEY || 'default-32-character-encryption-key';
  const key = Buffer.from((k.length < 32 ? k.padEnd(32, '0') : k.slice(0, 32)), 'utf-8');
  const p = String(enc).split(':');
  if (p.length !== 3) return enc;
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(p[0], 'hex'));
  d.setAuthTag(Buffer.from(p[1], 'hex'));
  return d.update(p[2], 'hex', 'utf-8') + d.final('utf-8');
}

async function zoomToken() {
  const r = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}` },
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('zoom token: ' + JSON.stringify(j));
  return j.access_token;
}

async function ytAccessToken(refresh) {
  const body = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  if (!j.access_token) throw new Error('yt token: ' + JSON.stringify(j));
  return j.access_token;
}

// Match the website's YouTube post system: use a still-valid stored access
// token first, then refresh it. An environment refresh token takes priority
// when explicitly configured for the worker server.
async function getYouTubeAccessToken(account) {
  if (process.env.YOUTUBE_REFRESH_TOKEN) {
    return ytAccessToken(process.env.YOUTUBE_REFRESH_TOKEN);
  }

  const storedAccessToken = account?.accessToken ? decrypt(account.accessToken) : '';
  const expiry = account?.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : 0;
  if (storedAccessToken && Number.isFinite(expiry) && expiry > Date.now() + 60_000) {
    return storedAccessToken;
  }

  const storedRefreshToken = account?.refreshToken ? decrypt(account.refreshToken) : '';
  if (!storedRefreshToken) throw new Error('No YouTube refresh token configured');
  return ytAccessToken(storedRefreshToken);
}

async function ytUpload(access, srcUrl, size, title, desc) {
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' },
      body: JSON.stringify({ snippet: { title: title.slice(0, 99), description: desc, categoryId: '22' }, status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false } }),
    });
    if (!init.ok) {
      lastError = `yt init ${init.status} ${await init.text()}`;
    } else {
      const loc = init.headers.get('location');
      if (!loc) lastError = 'no upload url';
      else {
        const src = await fetch(srcUrl);
        if (!src.ok) throw new Error('zoom dl ' + src.status);
        const put = await fetch(loc, { method: 'PUT', headers: { 'Content-Length': String(size), 'Content-Type': 'video/mp4' }, body: src.body, duplex: 'half' });
        const responseText = await put.text();
        let j = {};
        try { j = responseText ? JSON.parse(responseText) : {}; } catch { j = {}; }
        if (put.ok && j.id) return j.id;
        lastError = `yt put ${put.status} ${responseText || JSON.stringify(j)}`;
      }
    }
    if (attempt < 3 && /\b(429|500|502|503|504)\b/.test(lastError)) {
      const delayMs = attempt * 15000;
      log(`  YouTube transient upload error; retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/3)`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    break;
  }
  throw new Error(lastError || 'YouTube upload failed');
}

// Find a playlist owned by this channel with an exact title match, or create
// a new UNLISTED playlist with that title if none exists.
async function ytPlaylistFindOrCreate(access, title) {
  let pageToken = '';
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
    const j = await r.json();
    if (!r.ok) throw new Error('yt playlists.list ' + r.status + ' ' + JSON.stringify(j));
    const found = (j.items || []).find((p) => p.snippet?.title === title);
    if (found) return found.id;
    pageToken = j.nextPageToken;
  } while (pageToken);

  const create = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ snippet: { title, description: title }, status: { privacyStatus: 'unlisted' } }),
  });
  const j = await create.json();
  if (!create.ok) throw new Error('yt playlists.insert ' + create.status + ' ' + JSON.stringify(j));
  return j.id;
}

// Add an uploaded video to a playlist.
async function ytPlaylistAddVideo(access, playlistId, videoId) {
  const r = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('yt playlistItems.insert ' + r.status + ' ' + JSON.stringify(j));
  return j.id;
}

// Look up the Zoom meeting → community/playlist mapping from Bunny Database.
async function getZoomMapping(zoomMeetingId, bunnyClient) {
  try {
    const sqlMapping = await bunnyClient.execute({
      sql: 'SELECT * FROM zoom_community_mappings_sql WHERE zoom_meeting_id = ? LIMIT 1',
      args: [zoomMeetingId],
    });
    if (sqlMapping.rows[0]) {
      const row = sqlMapping.rows[0];
      return {
        zoomMeetingId: String(row.zoom_meeting_id),
        communityId: String(row.community_id),
        communityName: row.community_name || undefined,
        zoomTopic: row.zoom_topic || undefined,
        thumbnailUrl: row.thumbnail_url || undefined,
        youtubePlaylistName: row.youtube_playlist_name || undefined,
      };
    }
    const rows = await bunnyClient.execute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'",
    });
    for (const row of rows.rows) {
      try {
        const p = JSON.parse(String(row.document_json || '{}'));
        if (p.platform === 'youtube') {
          const mappings = p?.metadata?.zoomMappings || [];
          return mappings.find((mp) => mp.zoomMeetingId === zoomMeetingId) || null;
        }
      } catch {}
    }
  } catch {
    return null;
  }
  return null;
}

// Move a meeting's cloud recording to Zoom trash (recoverable ~30 days).
// Use action=trash (NOT delete) so it's never permanently removed.
async function trashRecording(uuid, token) {
  const enc = (uuid.startsWith('/') || uuid.includes('//'))
    ? encodeURIComponent(encodeURIComponent(uuid))
    : encodeURIComponent(uuid);
  const r = await fetch(`https://api.zoom.us/v2/meetings/${enc}/recordings?action=trash`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 204 || r.ok) return true;
  throw new Error('trash ' + r.status + ' ' + await r.text());
}

// Auto-add a selected recording to the configured community using its
// public Bunny CDN MP4 URL — plays directly, no YouTube invite step needed.
async function autoAddToConfiguredCommunity(videoUrl, topic, dateLabel, zoomMeetingId, bunnyClient, thumbnailUrl, recordingType) {
  let communityId = 'global';
  let communityName = 'Global';
  let batchName = null;
  let thumb = thumbnailUrl || null;

  // Look up the zoom meeting ID in socialmediaaccounts.metadata.zoomMappings
  try {
    const sqlMapping = await bunnyClient.execute({
      sql: 'SELECT * FROM zoom_community_mappings_sql WHERE zoom_meeting_id = ? LIMIT 1',
      args: [zoomMeetingId],
    });
    if (sqlMapping.rows[0]) {
      const row = sqlMapping.rows[0];
      communityId = String(row.community_id || communityId);
      communityName = row.community_name || communityId;
      batchName = row.zoom_topic || null;
      if (row.thumbnail_url) thumb = row.thumbnail_url;
    }
    const rows = await bunnyClient.execute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'",
    });
    for (const row of rows.rows) {
      try {
        const p = JSON.parse(String(row.document_json || '{}'));
        if (p.platform === 'youtube') {
          const mapping = (p?.metadata?.zoomMappings || []).find((m) => m.zoomMeetingId === zoomMeetingId);
          if (mapping) {
            communityId = mapping.communityId;
            communityName = mapping.communityName || mapping.communityId;
            batchName = mapping.zoomTopic || null;
            if (mapping.thumbnailUrl) thumb = mapping.thumbnailUrl;
            log(`  Zoom mapping found: ${zoomMeetingId} → ${communityName}`);
          } else {
            log(`  No mapping for Zoom meeting ${zoomMeetingId}, using default 'global'`);
          }
          break;
        }
      } catch {}
    }
  } catch (e) {
    log(`  Zoom mapping lookup failed, falling back to 'global':`, e.message);
  }

  const playlistName = batchName || dateLabel;
  const playlistTag = `playlist:${playlistName}`;

  try {
    // Check duplicate
    const existRes = await bunnyClient.execute({
      sql: "SELECT document_id FROM mongo_documents WHERE collection_name = 'communityvideos' AND json_extract(document_json, '$.communityId') = ? AND json_extract(document_json, '$.s3Url') = ? LIMIT 1",
      args: [communityId, videoUrl],
    });
    if (existRes.rows.length > 0) return;

    // Count videos in this playlist
    const cntRes = await bunnyClient.execute({
      sql: "SELECT count(*) as cnt FROM mongo_documents WHERE collection_name = 'communityvideos' AND json_extract(document_json, '$.communityId') = ? AND document_json LIKE ?",
      args: [communityId, `%${playlistTag}%`],
    });
    const videoNumber = Number(cntRes.rows[0]?.cnt || 0) + 1;
    const title = `${communityName} > ${playlistName} > Video ${videoNumber}`;

    const doc = {
      communityId, videoSource: 'bunny', s3Url: videoUrl, title,
      description: `Zoom recording from ${dateLabel}`, thumbnailUrl: thumb,
      uploadedBy: 'zoom-uploader', isShareable: false, isCommon: true,
      source: 'zoom', zoomMeetingId, recordingType,
      tags: [`folder:${communityName}`, playlistTag, 'recording', `video:${videoNumber}`],
      createdAt: new Date().toISOString(),
    };
    await bunnyClient.execute({
      sql: "INSERT INTO mongo_documents (source_database, collection_name, document_id, document_json) VALUES ('swarsakshiDB', 'communityvideos', ?, ?)",
      args: [crypto.randomUUID(), JSON.stringify(doc)],
    });
    log(`  Community (${communityName}) OK: added as "${title}" (Bunny)`);
  } catch (e) {
    log(`  Community FAIL:`, e.message);
  }
}

// Add the unlisted YouTube copy to the same community as an ordered Day N
// recording. Speaker and Gallery views from one Zoom meeting share one day
// number; the next meeting gets the next available day number.
async function autoAddYoutubeToConfiguredCommunity(youtubeVideoId, topic, dateLabel, zoomMeetingId, bunnyClient, thumbnailUrl, recordingType) {
  let communityId = 'global';
  let communityName = 'Global';
  let playlistName = dateLabel;
  let configuredThumbnail = thumbnailUrl || null;

  try {
    const sqlMapping = await bunnyClient.execute({
      sql: 'SELECT * FROM zoom_community_mappings_sql WHERE zoom_meeting_id = ? LIMIT 1',
      args: [zoomMeetingId],
    });
    if (sqlMapping.rows[0]) {
      const row = sqlMapping.rows[0];
      communityId = String(row.community_id || communityId);
      communityName = row.community_name || communityId;
      playlistName = row.zoom_topic || dateLabel;
      configuredThumbnail = row.thumbnail_url || configuredThumbnail;
    }
    const rows = await bunnyClient.execute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'",
    });
    for (const row of rows.rows) {
      try {
        const p = JSON.parse(String(row.document_json || '{}'));
        if (p.platform === 'youtube') {
          const mapping = (p?.metadata?.zoomMappings || []).find((m) => m.zoomMeetingId === zoomMeetingId);
          if (mapping) {
            communityId = mapping.communityId;
            communityName = mapping.communityName || mapping.communityId;
            playlistName = mapping.zoomTopic || dateLabel;
            configuredThumbnail = mapping.thumbnailUrl || configuredThumbnail;
          }
          break;
        }
      } catch {}
    }
  } catch (e) {
    log(`  YouTube community mapping lookup failed:`, e.message);
  }

  const playlistTag = `playlist:${playlistName}`;

  // Find existing day number for this meeting
  let dayNumber = 0;
  try {
    const sameMeetingRes = await bunnyClient.execute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'communityvideos' AND json_extract(document_json, '$.communityId') = ? AND json_extract(document_json, '$.zoomMeetingId') = ? AND document_json LIKE ? LIMIT 1",
      args: [communityId, zoomMeetingId, `%${playlistTag}%`],
    });
    if (sameMeetingRes.rows.length > 0) {
      const existingDoc = JSON.parse(String(sameMeetingRes.rows[0].document_json || '{}'));
      const dayTag = (existingDoc.tags || []).find((t) => /^day:\d+$/.test(t));
      if (dayTag) dayNumber = Number(dayTag.slice(4));
    }
    if (!dayNumber) {
      const allRes = await bunnyClient.execute({
        sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'communityvideos' AND json_extract(document_json, '$.communityId') = ? AND document_json LIKE ?",
        args: [communityId, `%${playlistTag}%`],
      });
      let maxDay = 0;
      for (const row of allRes.rows) {
        try {
          const d = JSON.parse(String(row.document_json || '{}'));
          const dt = (d.tags || []).find((t) => /^day:\d+$/.test(t));
          if (dt) maxDay = Math.max(maxDay, Number(dt.slice(4)));
        } catch {}
      }
      dayNumber = maxDay + 1;
    }
  } catch (e) {
    log(`  YouTube day number lookup failed:`, e.message);
    dayNumber = 1;
  }

  // Check duplicate
  try {
    const dupRes = await bunnyClient.execute({
      sql: "SELECT document_id FROM mongo_documents WHERE collection_name = 'communityvideos' AND json_extract(document_json, '$.youtubeVideoId') = ? LIMIT 1",
      args: [youtubeVideoId],
    });
    if (dupRes.rows.length > 0) {
      log(`  YouTube community already has ${youtubeVideoId}; skipping duplicate`);
      return;
    }
  } catch {}

  const viewName = recordingType === 'speaker_view' ? 'Speaker View' : 'Gallery View';
  const youtubeUrl = `https://youtu.be/${youtubeVideoId}`;
  const title = `${communityName} > ${playlistName} > Day ${dayNumber} - ${viewName}`;
  try {
    await bunnyClient.execute({
      sql: "INSERT INTO mongo_documents (source_database, collection_name, document_id, document_json) VALUES ('swarsakshiDB', 'communityvideos', ?, ?)",
      args: [crypto.randomUUID(), JSON.stringify({
        communityId, title,
        description: `Day ${dayNumber} recording from ${dateLabel} (${viewName})`,
        videoSource: 'youtube', youtubeVideoId, youtubeUrl, youtubeUnlisted: true,
        thumbnailUrl: configuredThumbnail || `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
        uploadedBy: 'zoom-uploader', isShareable: false, isCommon: true,
        source: 'youtube_recording', zoomMeetingId, recordingType,
        tags: [`folder:${communityName}`, playlistTag, `day:${dayNumber}`, 'recording', 'youtube'],
        createdAt: new Date().toISOString(),
      })],
    });
    log(`  YouTube community OK: added "${title}" (${youtubeUrl})`);
  } catch (e) {
    log(`  YouTube community insert FAIL:`, e.message);
  }
}

// Save the MP4 into the Bunny STORAGE zone under zoom-videos/ (a real folder),
// streaming straight from Zoom — no temp file on disk.
async function bunnyStorageSave(srcUrl, size, fileName) {
  const zone = process.env.BUNNY_ZOOM_STORAGE_ZONE || 'swaryogadb';
  const key = process.env.BUNNY_ZOOM_STORAGE_KEY;
  if (!key) { log('Bunny Storage: missing BUNNY_ZOOM_STORAGE_KEY, skip'); return null; }
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 180);
  const dest = `zoom-videos/${safe}`;
  const existing = await fetch(`https://${process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net'}/${encodeURI(dest)}`, { method: 'HEAD' }).catch(() => null);
  if (existing?.ok) return dest;
  const src = await fetch(srcUrl);
  if (!src.ok) throw new Error('zoom dl ' + src.status);
  const put = await fetch(`https://storage.bunnycdn.com/${zone}/${encodeURI(dest)}`, {
    method: 'PUT',
    headers: { AccessKey: key, 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: src.body,
    duplex: 'half',
  });
  if (!put.ok) throw new Error('bunny storage put ' + put.status + ' ' + await put.text());
  return dest;
}

async function listZoomRecordings(host, token, from, to, includeTrash = false) {
  const query = new URLSearchParams({ from, to, page_size: '100' });
  if (includeTrash) query.set('trash', 'true');
  const r = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(host)}/recordings?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`zoom recordings ${r.status} ${JSON.stringify(data)}`);
  return Array.isArray(data.meetings) ? data.meetings : [];
}

// Public CDN URL for a Bunny Storage path (storage zone is fronted by this pull zone).
function bunnyCdnUrl(dest) {
  const host = process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net';
  return `https://${host}/${encodeURI(dest)}`;
}

// Sync YouTube & Bunny URLs directly to workshop_recordings_sql in Bunny Database
async function syncToWorkshopDatabase(zoomMeetingId, zoomUuid, dateLabel, ytResults, ytUrls, bunnyResults, bunnyClient) {
  try {
    const cohortRes = await bunnyClient.execute({
      sql: 'SELECT id, start_date FROM workshop_cohorts_sql WHERE zoom_meeting_id = ? LIMIT 1',
      args: [zoomMeetingId]
    });
    if (!cohortRes.rows || cohortRes.rows.length === 0) {
      log(`  Workshop sync: No cohort found matching zoomMeetingId ${zoomMeetingId}`);
      return;
    }
    const cohort = cohortRes.rows[0];
    const cohortId = String(cohort.id);
    let dayNumber = 1;
    if (cohort.start_date) {
      const start = new Date(String(cohort.start_date).slice(0, 10)).getTime();
      const cur = new Date(dateLabel).getTime();
      const diff = Math.round((cur - start) / 86400000);
      dayNumber = diff >= 0 ? diff + 1 : 1;
    }

    const ytSpeakerId = ytResults?.speaker || null;
    const ytSpeakerUrl = ytUrls?.speaker || (ytSpeakerId ? `https://youtu.be/${ytSpeakerId}` : null);
    const ytGalleryId = ytResults?.gallery || null;
    const ytGalleryUrl = ytUrls?.gallery || (ytGalleryId ? `https://youtu.be/${ytGalleryId}` : null);
    const bunnySpeakerUrl = bunnyResults?.speaker ? bunnyCdnUrl(bunnyResults.speaker) : null;
    const bunnyGalleryUrl = bunnyResults?.gallery ? bunnyCdnUrl(bunnyResults.gallery) : null;

    const existingRec = await bunnyClient.execute({
      sql: 'SELECT id, day_number FROM workshop_recordings_sql WHERE cohort_id = ? AND class_date = ?',
      args: [cohortId, dateLabel]
    });

    const recId = existingRec.rows[0]?.id ? String(existingRec.rows[0].id) : crypto.randomUUID();
    const finalDayNumber = existingRec.rows[0]?.day_number || dayNumber;

    await bunnyClient.execute({
      sql: `INSERT INTO workshop_recordings_sql (
        id, cohort_id, class_date, day_number, zoom_meeting_id, zoom_meeting_uuid,
        youtube_speaker_id, youtube_gallery_id, youtube_speaker_url, youtube_gallery_url,
        bunny_speaker_url, bunny_gallery_url, delivered_student_ids_json, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        day_number = COALESCE(workshop_recordings_sql.day_number, excluded.day_number),
        zoom_meeting_id = excluded.zoom_meeting_id,
        zoom_meeting_uuid = excluded.zoom_meeting_uuid,
        youtube_speaker_id = COALESCE(excluded.youtube_speaker_id, workshop_recordings_sql.youtube_speaker_id),
        youtube_gallery_id = COALESCE(excluded.youtube_gallery_id, workshop_recordings_sql.youtube_gallery_id),
        youtube_speaker_url = COALESCE(excluded.youtube_speaker_url, workshop_recordings_sql.youtube_speaker_url),
        youtube_gallery_url = COALESCE(excluded.youtube_gallery_url, workshop_recordings_sql.youtube_gallery_url),
        bunny_speaker_url = COALESCE(excluded.bunny_speaker_url, workshop_recordings_sql.bunny_speaker_url),
        bunny_gallery_url = COALESCE(excluded.bunny_gallery_url, workshop_recordings_sql.bunny_gallery_url),
        updated_at = CURRENT_TIMESTAMP`,
      args: [
        recId, cohortId, dateLabel, finalDayNumber, zoomMeetingId, zoomUuid,
        ytSpeakerId, ytGalleryId, ytSpeakerUrl, ytGalleryUrl,
        bunnySpeakerUrl, bunnyGalleryUrl
      ]
    });
    log(`  Workshop sync OK: updated workshop_recordings_sql for cohort ${cohortId} date ${dateLabel}`);
  } catch (err) {
    log('  Workshop sync FAIL:', err.message);
  }
}

(async () => {
  log('uploader start (lookback', LOOKBACK, 'days)');
  const zt = await zoomToken();
  const host = process.env.ZOOM_USER_EMAIL || 'me';
  const to = new Date();
  const from = new Date(Date.now() - LOOKBACK * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const meetings = await listZoomRecordings(host, zt, fmt(from), fmt(to));

  // Connect to Bunny Database (LibSQL) — sole database for this script
  const dbUrl = process.env.BUNNY_DATABASE_URL?.trim();
  const dbToken = process.env.BUNNY_DATABASE_AUTH_TOKEN?.trim();
  if (!dbUrl || !dbToken) {
    log('FATAL: BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required.');
    process.exit(1);
  }
  const bunnyClient = createClient({ url: dbUrl, authToken: dbToken });

  const trashEnabled = await bunnyClient.execute({
    sql: 'SELECT zoom_meeting_id FROM workshop_cohorts_sql WHERE auto_recover_zoom_trash = 1 AND zoom_meeting_id IS NOT NULL',
  }).then((r) => new Set(r.rows.map((row) => String(row.zoom_meeting_id)))).catch(() => new Set());
  const trashedMeetings = [];
  for (const zoomMeetingId of trashEnabled) {
    try {
      const trashed = await listZoomRecordings(host, zt, fmt(from), fmt(to), true);
      trashedMeetings.push(...trashed.filter((meeting) => String(meeting.id) === zoomMeetingId).map((meeting) => ({ ...meeting, fromZoomTrash: true })));
    } catch (error) {
      log(`Zoom trash lookup failed for meeting ${zoomMeetingId}:`, error.message);
    }
  }
  const meetingMap = new Map();
  for (const meeting of [...meetings, ...trashedMeetings]) {
    const key = String(meeting.uuid || `${meeting.id}:${meeting.start_time}`);
    meetingMap.set(key, meeting);
  }
  const selectedMeetings = TARGET_MEETING_ID
    ? [...meetingMap.values()].filter((meeting) => String(meeting.id) === TARGET_MEETING_ID)
    : [...meetingMap.values()];
  if (TARGET_MEETING_ID) log('target meeting filter:', TARGET_MEETING_ID, 'matched', selectedMeetings.length);
  log('found', selectedMeetings.length, 'recorded meeting(s) in window');

  // Load YouTube account from Bunny Database
  let ytDoc = null;
  try {
    const rows = await bunnyClient.execute({
      sql: "SELECT data_json FROM social_media_accounts_sql WHERE platform = 'youtube' AND is_connected = 1 ORDER BY updated_at DESC LIMIT 1",
    });
    if (rows.rows[0]) {
      ytDoc = JSON.parse(String(rows.rows[0].data_json || '{}'));
      log('Loaded YouTube account configuration from Bunny Database');
    }
    if (!ytDoc) {
      const legacyRows = await bunnyClient.execute({ sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'" });
      for (const row of legacyRows.rows) {
        try { const p = JSON.parse(String(row.document_json || '{}')); if (p.platform === 'youtube') { ytDoc = p; break; } } catch {}
      }
    }
  } catch (bErr) {
    log('Bunny Database lookup error:', bErr.message);
  }

  if (!ytDoc?.refreshToken) {
    log('No YouTube account with refresh token connected — aborting.');
    bunnyClient.close();
    return;
  }

  let yt;
  try {
    yt = await getYouTubeAccessToken(ytDoc);
  } catch (ytTokenErr) {
    log('CRITICAL: YouTube access token error:', ytTokenErr.message);
    log('TIP: If invalid_grant, please reconnect YouTube in Admin -> Social Media Setup and verify Google Cloud OAuth consent status.');
    bunnyClient.close();
    return;
  }

  // Idempotency without a new collection:
  // track done meetings as an array on the YouTube account doc's metadata.
  const done = new Set((ytDoc.metadata?.uploadedMeetings || []).map((u) => u.uuid));

  let processed = 0;
  for (const m of selectedMeetings) {
    if (done.has(m.uuid)) continue; // already uploaded
    const existingRecording = await bunnyClient.execute({
      sql: 'SELECT youtube_speaker_url, youtube_gallery_url, bunny_speaker_url, bunny_gallery_url FROM workshop_recordings_sql WHERE zoom_meeting_uuid = ? LIMIT 1',
      args: [String(m.uuid)],
    }).catch(() => ({ rows: [] }));
    const existing = existingRecording.rows[0];
    if (existing?.youtube_speaker_url && existing?.youtube_gallery_url && existing?.bunny_speaker_url && existing?.bunny_gallery_url) {
      log(`→ ${m.topic}: already has complete YouTube/Bunny URLs; skipping duplicate upload`);
      continue;
    }
    const ageMinutes = (Date.now() - new Date(m.start_time).getTime()) / 60000;
    if (Number.isFinite(ageMinutes) && ageMinutes < MIN_AGE_MINUTES) {
      log(`→ ${m.topic}: waiting ${Math.ceil(MIN_AGE_MINUTES - ageMinutes)} more minute(s) for Zoom processing`);
      continue;
    }

    if (m.status && !['completed', 'complete'].includes(String(m.status).toLowerCase())) {
      log(`→ ${m.topic}: Zoom status is ${m.status}; waiting for completed recording`);
      continue;
    }

    const allMp4 = (m.recording_files || []).filter((f) => f.file_type === 'MP4');
    const isReady = (f) => !f.status || ['completed', 'complete'].includes(String(f.status).toLowerCase());
    const mp4 = allMp4.filter(isReady);
    if (!mp4.length) {
      if (allMp4.length) log(`→ ${m.topic}: MP4 files are still processing; waiting for the next run`);
      continue;
    }
    const pick = (...t) => { for (const x of t) { const f = mp4.find((y) => y.recording_type === x); if (f) return f; } return null; };
    const hasRecordingType = (...t) => allMp4.some((f) => t.includes(f.recording_type));
    const speaker = pick('shared_screen_with_speaker_view', 'active_speaker', 'speaker_view');
    const gallery = pick('shared_screen_with_gallery_view', 'gallery_view');
    // If Zoom has listed a desired view but has not finished that file yet,
    // wait rather than uploading one view and marking the meeting complete.
    if ((hasRecordingType('shared_screen_with_speaker_view', 'active_speaker', 'speaker_view') && !speaker) ||
        (hasRecordingType('shared_screen_with_gallery_view', 'gallery_view') && !gallery)) {
      log(`→ ${m.topic}: one or more MP4 views are still processing; waiting for the next run`);
      continue;
    }
    const dl = (f) => `${f.download_url}?access_token=${zt}`;
    const dateLabel = m.start_time.slice(0, 10);
    const result = { _id: m.uuid, topic: m.topic, startTime: m.start_time, youtube: {}, youtubeUrls: {}, bunny: {}, uploadedAt: new Date() };
    const prior = existing || {};
    const youtubeId = (url) => String(url || '').match(/youtu\.be\/([^?/#]+)/)?.[1] || String(url || '').match(/[?&]v=([^&#]+)/)?.[1] || null;
    if (prior.youtube_speaker_url) { result.youtube.speaker = youtubeId(prior.youtube_speaker_url); result.youtubeUrls.speaker = prior.youtube_speaker_url; }
    if (prior.youtube_gallery_url) { result.youtube.gallery = youtubeId(prior.youtube_gallery_url); result.youtubeUrls.gallery = prior.youtube_gallery_url; }
    if (prior.bunny_speaker_url) result.bunny.speaker = String(prior.bunny_speaker_url).split('/zoom-videos/')[1] || null;
    if (prior.bunny_gallery_url) result.bunny.gallery = String(prior.bunny_gallery_url).split('/zoom-videos/')[1] || null;
    log(`→ ${m.topic} (${dateLabel}) speaker=${speaker?.recording_type || 'none'} gallery=${gallery?.recording_type || 'none'}`);

    // YouTube: 1 speaker view (with or without screen sharing) and same one gallery view
    for (const [f, view, key] of [[speaker, 'Speaker View', 'speaker'], [gallery, 'Gallery View', 'gallery']]) {
      if (!f || result.youtube[key]) continue;
      try {
        const id = await ytUpload(yt, dl(f), f.file_size, `${m.topic} — ${view} — ${dateLabel}`, `${m.topic}\nRecorded ${m.start_time}\n${view} (${f.recording_type})`);
        result.youtube[key] = id;
        result.youtubeUrls[key] = `https://youtu.be/${id}`;
        log(`  YT OK ${view}: ${result.youtubeUrls[key]}`);
        try {
          await autoAddYoutubeToConfiguredCommunity(
            id, m.topic, dateLabel, String(m.id), bunnyClient,
            `https://img.youtube.com/vi/${id}/hqdefault.jpg`, key === 'speaker' ? 'speaker_view' : 'gallery_view'
          );
        } catch (e) {
          log(`  YouTube community FAIL ${view}:`, e.message);
        }
      } catch (e) { log(`  YT FAIL ${view}:`, e.message); }
    }

    // Bunny: preserve both speaker and gallery views, matching YouTube output.
    for (const [f, view, key] of [[speaker, 'Speaker View', 'speaker'], [gallery, 'Gallery View', 'gallery']]) {
      if (!f || result.bunny[key]) continue;
      try {
        const bunnyPath = await bunnyStorageSave(dl(f), f.file_size, `${dateLabel} ${m.topic} (${key}).mp4`);
        result.bunny[key] = bunnyPath;
        log(`  Bunny Storage OK ${view}:`, bunnyPath);
        const ytId = result.youtube[key];
        const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
        await autoAddToConfiguredCommunity(
          bunnyCdnUrl(bunnyPath), m.topic, dateLabel, String(m.id),
          bunnyClient, thumb, key === 'speaker' ? 'speaker_view' : 'gallery_view'
        );
      } catch (e) { log(`  Bunny FAIL ${view}:`, e.message); }
    }

    // Add newly uploaded videos to the workshop's YouTube playlist (unlisted)
    if (result.youtube.speaker || result.youtube.gallery) {
      try {
        const mapping = await getZoomMapping(String(m.id), bunnyClient);
        if (mapping?.youtubePlaylistName) {
          const start = new Date(m.start_time);
          const monthName = start.toLocaleString('en-US', { month: 'long' });
          const year = String(start.getFullYear());
          const playlistTitle = mapping.youtubePlaylistName.replace(/\{MONTH\}/gi, monthName).replace(/\{YEAR\}/gi, year);
          const playlistId = await ytPlaylistFindOrCreate(yt, playlistTitle);
          for (const vid of [result.youtube.speaker, result.youtube.gallery].filter(Boolean)) {
            await ytPlaylistAddVideo(yt, playlistId, vid);
          }
          log(`  Playlist OK: "${playlistTitle}" ← ${[result.youtube.speaker, result.youtube.gallery].filter(Boolean).length} video(s)`);
        }
      } catch (e) { log('  Playlist FAIL:', e.message); }
    }

    // Mark done: YouTube speaker + gallery (if present) and Bunny speaker (if present)
    const expectedYoutubeKeys = [speaker && 'speaker', gallery && 'gallery'].filter(Boolean);
    const allYoutubeUploaded = expectedYoutubeKeys.length > 0 && expectedYoutubeKeys.every((key) => result.youtube[key]);
    const allBunnyStored = expectedYoutubeKeys.every((key) => result.bunny[key]);

    if (allYoutubeUploaded && allBunnyStored) {
      // Move the cloud recording to Zoom trash
      if (!m.fromZoomTrash && (process.env.DELETE_AFTER_UPLOAD || 'trash') !== 'off') {
        try { await trashRecording(m.uuid, zt); result.trashed = true; log('  Zoom recording → trash ✓'); }
        catch (e) { log('  Zoom trash FAIL:', e.message); }
      }
      // Update the YouTube account doc in Bunny DB with this meeting
      try {
        const uploadedMeetings = ytDoc.metadata?.uploadedMeetings || [];
        uploadedMeetings.push({ uuid: m.uuid, zoomMeetingId: String(m.id), topic: m.topic, startTime: m.start_time, youtube: result.youtube, youtubeUrls: result.youtubeUrls, bunny: result.bunny, trashed: !!result.trashed, at: new Date().toISOString() });
        ytDoc.metadata = { ...(ytDoc.metadata || {}), uploadedMeetings };
        const canonicalUpdate = await bunnyClient.execute({
          sql: "UPDATE social_media_accounts_sql SET data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE document_id = ?",
          args: [JSON.stringify(ytDoc), String(ytDoc._id || '')],
        });
        if (!Number(canonicalUpdate.rowsAffected || 0)) {
          await bunnyClient.execute({
            sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE collection_name = 'socialmediaaccounts' AND document_json LIKE '%\"platform\":\"youtube\"%'",
            args: [JSON.stringify(ytDoc)],
          });
        }
        log('  Bunny DB: uploadedMeetings updated');
      } catch (e) {
        log('  Bunny uploadedMeetings update warning:', e.message);
      }

      // Sync YouTube URLs and Bunny Speaker URL to workshop_recordings_sql
      await syncToWorkshopDatabase(String(m.id), m.uuid, dateLabel, result.youtube, result.youtubeUrls, result.bunny, bunnyClient);

      processed++;
    }
  }
  bunnyClient.close();
  log('uploader done. newly uploaded meetings:', processed);
})().catch((e) => { log('FATAL', e.message); process.exit(1); });
