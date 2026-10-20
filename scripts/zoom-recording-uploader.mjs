#!/usr/bin/env node
/**
 * Zoom recording → YouTube (+ Bunny) auto-uploader.
 *
 * Rule:
 *   • YouTube (Unlisted): Speaker view + Gallery view.
 *       - Prefer the WITH-screen version when the class shared a screen, else plain.
 *   • Bunny Storage: Speaker MP4 + MP3 audio
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
 *   RECORDING_LOOKBACK_DAYS (default 30)
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
import sessionUtils from '../lib/workshopSessionUtils.js';
import { recordingComplete, finalizeRecording, withRecordingMp3 } from './zoomRecordingArtifacts.mjs';
import { ytUpload } from './youtubeResumableUpload.mjs';

// Load worker/base settings first, then let the local production connection
// config override stale YouTube client values. A refresh token must be
// exchanged by the same OAuth client that created it.
for (const envName of ['.env.zoom-uploader', '.env', '.env.local']) {
  try {
    const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', envName);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: envName === '.env.local' });
    }
  } catch { /* ignore missing env file */ }
}

const log = (...a) => console.log(new Date().toISOString(), ...a);
const LOOKBACK = Number(process.env.RECORDING_LOOKBACK_DAYS || 30);
const MIN_AGE_MINUTES = Number(process.env.RECORDING_MIN_AGE_MINUTES || 10);
const TARGET_MEETING_ID = String(process.env.ZOOM_MEETING_ID || '').trim();
const YOUTUBE_ONLY = process.env.YOUTUBE_ONLY === 'true';

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
  const configuredRefreshToken = process.env.YOUTUBE_REFRESH_TOKEN || '';
  const storedAccessToken = account?.accessToken ? decrypt(account.accessToken) : '';
  const expiry = account?.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : 0;
  const storedRefreshToken = account?.refreshToken ? decrypt(account.refreshToken) : '';
  let configuredTokenError;

  if (configuredRefreshToken) {
    try {
      return await ytAccessToken(configuredRefreshToken);
    } catch (error) {
      configuredTokenError = error;
      log('Configured YOUTUBE_REFRESH_TOKEN was rejected; trying the connected YouTube account token.');
    }
  }

  if (storedAccessToken && Number.isFinite(expiry) && expiry > Date.now() + 60_000) {
    return storedAccessToken;
  }

  if (storedRefreshToken && storedRefreshToken !== configuredRefreshToken) {
    try {
      return await ytAccessToken(storedRefreshToken);
    } catch (error) {
      if (configuredTokenError) {
        throw new Error(`Configured YouTube refresh token failed: ${configuredTokenError.message}; connected account refresh token failed: ${error.message}`);
      }
      throw error;
    }
  }

  if (configuredTokenError) throw configuredTokenError;
  throw new Error('No YouTube refresh token configured');
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
    const cleanId = String(zoomMeetingId).replace(/\D+/g, '');
    const sqlMapping = await bunnyClient.execute({
      sql: "SELECT * FROM zoom_community_mappings_sql WHERE REPLACE(zoom_meeting_id, ' ', '') = ? OR zoom_meeting_id = ? LIMIT 1",
      args: [cleanId, zoomMeetingId],
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
      sql: "SELECT data_json FROM social_media_accounts_sql WHERE platform = 'youtube' AND is_connected = 1 LIMIT 1",
    });
    if (rows.rows[0]) {
      const p = JSON.parse(String(rows.rows[0].data_json || '{}'));
      const mappings = p?.metadata?.zoomMappings || [];
      return mappings.find((mp) => String(mp.zoomMeetingId).replace(/\D+/g, '') === cleanId) || null;
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

  try {
    const cleanId = String(zoomMeetingId).replace(/\D+/g, '');
    const sqlMapping = await bunnyClient.execute({
      sql: "SELECT * FROM zoom_community_mappings_sql WHERE REPLACE(zoom_meeting_id, ' ', '') = ? OR zoom_meeting_id = ? LIMIT 1",
      args: [cleanId, zoomMeetingId],
    });
    if (sqlMapping.rows[0]) {
      const row = sqlMapping.rows[0];
      communityId = String(row.community_id || communityId);
      communityName = row.community_name || communityId;
      batchName = row.zoom_topic || null;
      if (row.thumbnail_url) thumb = row.thumbnail_url;
      log(`  Zoom mapping found: ${zoomMeetingId} → ${communityName}`);
    } else {
      const rows = await bunnyClient.execute({
        sql: "SELECT data_json FROM social_media_accounts_sql WHERE platform = 'youtube' AND is_connected = 1 LIMIT 1",
      });
      if (rows.rows[0]) {
        const p = JSON.parse(String(rows.rows[0].data_json || '{}'));
        const mapping = (p?.metadata?.zoomMappings || []).find((m) => String(m.zoomMeetingId).replace(/\D+/g, '') === cleanId);
        if (mapping) {
          communityId = mapping.communityId;
          communityName = mapping.communityName || mapping.communityId;
          batchName = mapping.zoomTopic || null;
          if (mapping.thumbnailUrl) thumb = mapping.thumbnailUrl;
          log(`  Zoom mapping found: ${zoomMeetingId} → ${communityName}`);
        }
      }
    }
  } catch (e) {
    log(`  Zoom mapping lookup failed, falling back to 'global':`, e.message);
  }

  const playlistName = batchName || dateLabel;
  const playlistTag = `playlist:${playlistName}`;

  try {
    // Check duplicate
    const existRes = await bunnyClient.execute({
      sql: "SELECT document_id FROM community_videos_sql WHERE community_id = ? AND json_extract(data_json, '$.s3Url') = ? LIMIT 1",
      args: [communityId, videoUrl],
    });
    if (existRes.rows.length > 0) return;

    // Count videos in this playlist
    const cntRes = await bunnyClient.execute({
      sql: "SELECT count(*) as cnt FROM community_videos_sql WHERE community_id = ? AND data_json LIKE ?",
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
      sql: "INSERT INTO community_videos_sql (document_id, community_id, title, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [crypto.randomUUID(), communityId, title, JSON.stringify(doc)],
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
    const cleanId = String(zoomMeetingId).replace(/\D+/g, '');
    const sqlMapping = await bunnyClient.execute({
      sql: "SELECT * FROM zoom_community_mappings_sql WHERE REPLACE(zoom_meeting_id, ' ', '') = ? OR zoom_meeting_id = ? LIMIT 1",
      args: [cleanId, zoomMeetingId],
    });
    if (sqlMapping.rows[0]) {
      const row = sqlMapping.rows[0];
      communityId = String(row.community_id || communityId);
      communityName = row.community_name || communityId;
      playlistName = row.zoom_topic || dateLabel;
      configuredThumbnail = row.thumbnail_url || configuredThumbnail;
    } else {
      const rows = await bunnyClient.execute({
        sql: "SELECT data_json FROM social_media_accounts_sql WHERE platform = 'youtube' AND is_connected = 1 LIMIT 1",
      });
      if (rows.rows[0]) {
        const p = JSON.parse(String(rows.rows[0].data_json || '{}'));
        const mapping = (p?.metadata?.zoomMappings || []).find((m) => String(m.zoomMeetingId).replace(/\D+/g, '') === cleanId);
        if (mapping) {
          communityId = mapping.communityId;
          communityName = mapping.communityName || mapping.communityId;
          playlistName = mapping.zoomTopic || dateLabel;
          configuredThumbnail = mapping.thumbnailUrl || configuredThumbnail;
        }
      }
    }
  } catch (e) {
    log(`  YouTube community mapping lookup failed:`, e.message);
  }

  const playlistTag = `playlist:${playlistName}`;

  // Find existing day number for this meeting
  let dayNumber = 0;
  try {
    const cleanMeetingId = String(zoomMeetingId).replace(/\D+/g, '');
    const sameMeetingRes = await bunnyClient.execute({
      sql: "SELECT data_json FROM community_videos_sql WHERE community_id = ? AND json_extract(data_json, '$.zoomMeetingId') = ? AND data_json LIKE ? LIMIT 1",
      args: [communityId, zoomMeetingId, `%${playlistTag}%`],
    });
    if (sameMeetingRes.rows.length > 0) {
      const existingDoc = JSON.parse(String(sameMeetingRes.rows[0].data_json || '{}'));
      const dayTag = (existingDoc.tags || []).find((t) => /^day:\d+$/.test(t));
      if (dayTag) dayNumber = Number(dayTag.slice(4));
    }
    if (!dayNumber) {
      const allRes = await bunnyClient.execute({
        sql: "SELECT data_json FROM community_videos_sql WHERE community_id = ? AND data_json LIKE ?",
        args: [communityId, `%${playlistTag}%`],
      });
      let maxDay = 0;
      for (const row of allRes.rows) {
        try {
          const d = JSON.parse(String(row.data_json || '{}'));
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
      sql: "SELECT document_id FROM community_videos_sql WHERE json_extract(data_json, '$.youtubeVideoId') = ? LIMIT 1",
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
      sql: "INSERT INTO community_videos_sql (document_id, community_id, title, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [crypto.randomUUID(), communityId, title, JSON.stringify({
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

// Dedicated language collections in Bunny Stream Library 606386
const BUNNY_STREAM_COLLECTIONS = {
  HINDI: process.env.BUNNY_STREAM_COLLECTION_HINDI || '563e0c4c-a1d4-490f-a5ba-f9b2073c51b5',
  ENGLISH: process.env.BUNNY_STREAM_COLLECTION_ENGLISH || '015d1b9e-1f88-4f83-b1cd-aaa3ffb0cfdb',
  MARATHI: process.env.BUNNY_STREAM_COLLECTION_MARATHI || '1c320b6a-d9f5-4ddf-9708-8601d05a838e',
};

function getCollectionIdForTopic(topicOrName = '') {
  const text = String(topicOrName).toLowerCase();
  if (text.includes('marathi')) return BUNNY_STREAM_COLLECTIONS.MARATHI;
  if (text.includes('english')) return BUNNY_STREAM_COLLECTIONS.ENGLISH;
  if (text.includes('hindi')) return BUNNY_STREAM_COLLECTIONS.HINDI;
  return BUNNY_STREAM_COLLECTIONS.HINDI;
}

// Upload video directly to Bunny Stream inside designated language collection
// Streams Zoom MP4 directly without temporary files on disk
async function bunnyStreamSave(srcUrl, size, title, collectionId) {
  const apiKey = process.env.BUNNY_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '606386';
  if (!apiKey) throw new Error('BUNNY_API_KEY is required for Bunny Stream');

  const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      ...(collectionId ? { collectionId } : {}),
    }),
  });

  const video = await createRes.json();
  if (!createRes.ok || !video?.guid) {
    throw new Error(`Bunny Stream create failed (${createRes.status}): ${JSON.stringify(video)}`);
  }

  const src = await fetch(srcUrl, { signal: AbortSignal.timeout(60 * 60 * 1000) });
  if (!src.ok) throw new Error(`Zoom download failed: ${src.status}`);

  const put = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${video.guid}`, {
    method: 'PUT',
    headers: {
      AccessKey: apiKey,
      'Content-Type': 'application/octet-stream',
      ...(size ? { 'Content-Length': String(size) } : {}),
    },
    body: src.body,
    duplex: 'half',
    signal: AbortSignal.timeout(60 * 60 * 1000),
  });

  if (!put.ok) {
    const errorText = await put.text();
    throw new Error(`Bunny Stream upload failed (${put.status}): ${errorText}`);
  }

  const playUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${video.guid}`;
  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${video.guid}`;

  return {
    guid: video.guid,
    playUrl,
    embedUrl,
  };
}

// Save the MP4 into the Bunny STORAGE zone under zoom-videos/ (a real folder),
// streaming straight from Zoom — no temp file on disk.
async function bunnyStorageSave(srcUrl, size, fileName) {
  const zone = process.env.BUNNY_ZOOM_STORAGE_ZONE || 'swaryogadb';
  const key = process.env.BUNNY_ZOOM_STORAGE_KEY;
  if (!key) throw new Error('BUNNY_ZOOM_STORAGE_KEY is required');
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 180);
  const dest = `zoom-videos/${safe}`;
  const existing = await fetch(`https://${process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net'}/${encodeURI(dest)}`, { method: 'HEAD' }).catch(() => null);
  if (existing?.ok) return dest;
  const src = await fetch(srcUrl, { signal: AbortSignal.timeout(30 * 60 * 1000) });
  if (!src.ok) throw new Error('zoom dl ' + src.status);
  const put = await fetch(`https://storage.bunnycdn.com/${zone}/${encodeURI(dest)}`, {
    method: 'PUT',
    headers: { AccessKey: key, 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: src.body,
    duplex: 'half',
    signal: AbortSignal.timeout(30 * 60 * 1000),
  });
  if (!put.ok) throw new Error('bunny storage put ' + put.status + ' ' + await put.text());
  return dest;
}

async function listZoomRecordings(host, token, from, to, includeTrash = false) {
  const query = new URLSearchParams({ from, to, page_size: '100' });
  if (includeTrash) query.set('trash', 'true');
  const meetings = [];
  const seen = new Set();
  do {
    const r = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(host)}/recordings?${query}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const data = await r.json();
    if (!r.ok) throw new Error(`zoom recordings ${r.status} ${JSON.stringify(data)}`);
    meetings.push(...(data.meetings || []));
    if (!data.next_page_token) break;
    if (seen.has(data.next_page_token)) throw new Error('Zoom recording pagination repeated a token');
    seen.add(data.next_page_token);
    query.set('next_page_token', data.next_page_token);
  } while (true);
  return meetings;
}

// Public CDN URL for a Bunny Storage path or Bunny Stream direct URL.
function bunnyCdnUrl(dest) {
  if (!dest) return null;
  if (dest.startsWith('http://') || dest.startsWith('https://')) return dest;
  const host = process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net';
  return `https://${host}/${encodeURI(dest)}`;
}

// Sync YouTube & Bunny URLs directly to workshop_recordings_sql in Bunny Database
async function syncToWorkshopDatabase(zoomMeetingId, zoomUuid, dateLabel, ytResults, ytUrls, bunnyResults, bunnyClient, cohort) {
  try {
    const cohortId = String(cohort.id);
    const calendar = sessionUtils.workshopSessionCalendar(String(cohort.start_date), JSON.parse(String(cohort.holiday_dates_json || '[]')));
    const calDay = calendar.find(row => row.classDate === dateLabel && !row.holiday)?.dayNumber;
    const elapsedDays = Math.max(1, Math.floor((new Date(dateLabel).getTime() - new Date(cohort.start_date).getTime()) / 86400000) + 1);
    const dayNumber = calDay || elapsedDays;

    const ytSpeakerId = ytResults?.speaker || null;
    const ytSpeakerUrl = ytUrls?.speaker || (ytSpeakerId ? `https://youtu.be/${ytSpeakerId}` : null);
    const ytGalleryId = ytResults?.gallery || null;
    const ytGalleryUrl = ytUrls?.gallery || (ytGalleryId ? `https://youtu.be/${ytGalleryId}` : null);
    const bunnySpeakerUrl = bunnyResults?.speaker ? bunnyCdnUrl(bunnyResults.speaker) : null;
    const bunnyGalleryUrl = bunnyResults?.gallery ? bunnyCdnUrl(bunnyResults.gallery) : null;

    const existingRec = await bunnyClient.execute({
      sql: 'SELECT id, day_number, zoom_meeting_uuid FROM workshop_recordings_sql WHERE cohort_id = ? AND class_date = ?',
      args: [cohortId, dateLabel]
    });
    if (existingRec.rows[0]?.zoom_meeting_uuid && existingRec.rows[0].zoom_meeting_uuid !== zoomUuid) {
      throw new Error(`Another Zoom recording already occupies workshop ${cohortId} on ${dateLabel}; manual reconciliation is required`);
    }

    const recId = existingRec.rows[0]?.id ? String(existingRec.rows[0].id) : crypto.randomUUID();
    const finalDayNumber = dayNumber;

    await bunnyClient.execute({
      sql: `INSERT INTO workshop_recordings_sql (
        id, cohort_id, class_date, day_number, zoom_meeting_id, zoom_meeting_uuid,
        youtube_speaker_id, youtube_gallery_id, youtube_speaker_url, youtube_gallery_url,
        bunny_speaker_url, bunny_gallery_url, delivered_student_ids_json, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(cohort_id, class_date) DO UPDATE SET
        day_number = excluded.day_number,
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
    if (bunnyResults?.audio) {
      await bunnyClient.execute({
        sql: "UPDATE workshop_recordings_sql SET metadata_json = json_set(metadata_json, '$.bunnyAudioUrl', ?), updated_at = CURRENT_TIMESTAMP WHERE cohort_id = ? AND class_date = ?",
        args: [bunnyCdnUrl(bunnyResults.audio), cohortId, dateLabel],
      });
    }
    if (bunnyResults?.streamVideoId || bunnyResults?.streamEmbedUrl) {
      await bunnyClient.execute({
        sql: "UPDATE workshop_recordings_sql SET metadata_json = json_set(metadata_json, '$.bunnyStreamVideoId', ?, '$.bunnyStreamEmbedUrl', ?), updated_at = CURRENT_TIMESTAMP WHERE cohort_id = ? AND class_date = ?",
        args: [bunnyResults.streamVideoId || null, bunnyResults.streamEmbedUrl || null, cohortId, dateLabel],
      });
    }
    log(`  Workshop sync OK: updated workshop_recordings_sql for cohort ${cohortId} date ${dateLabel}`);
  } catch (err) {
    log('  Workshop sync FAIL:', err.message);
    throw err;
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
  } catch (bErr) {
    log('Bunny Database lookup error:', bErr.message);
  }

  let yt = null;
  if (!ytDoc?.refreshToken && !process.env.YOUTUBE_REFRESH_TOKEN) {
    log('WARNING: No YouTube account with refresh token connected — YouTube upload will be skipped until connected.');
  } else {
    try {
      yt = await getYouTubeAccessToken(ytDoc);
      log('YouTube access token obtained successfully.');
    } catch (ytTokenErr) {
      log('WARNING: YouTube access token error:', ytTokenErr.message);
      log('TIP: YouTube upload will be skipped until reconnected in Admin -> Social Media Setup. Proceeding with Bunny Storage uploads (Speaker MP4 + MP3 audio).');
    }
  }

  let processed = 0;
  for (const m of selectedMeetings) {
    try {
      const existingRecording = await bunnyClient.execute({
        sql: 'SELECT youtube_speaker_url, youtube_gallery_url, bunny_speaker_url, bunny_gallery_url, metadata_json FROM workshop_recordings_sql WHERE zoom_meeting_uuid = ? LIMIT 1',
        args: [String(m.uuid)],
      });
      const existing = existingRecording.rows[0];
      const meetingDigits = String(m.id).replace(/\D+/g, '');
      const mapped = await bunnyClient.execute({
        sql: 'SELECT id, timezone, start_date, holiday_dates_json, zoom_meeting_id FROM workshop_cohorts_sql',
      });
      const matchedCohorts = mapped.rows.filter((cohort) => String(cohort.zoom_meeting_id || '').replace(/\D+/g, '') === meetingDigits);
      let cohort = null;
      if (matchedCohorts.length === 1) {
        cohort = matchedCohorts[0];
      } else if (matchedCohorts.length > 1) {
        const candidates = matchedCohorts.filter((cohort) => {
          const date = new Intl.DateTimeFormat('en-CA', { timeZone: String(cohort.timezone || 'Asia/Kolkata'), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(m.start_time));
          return sessionUtils.workshopSessionCalendar(String(cohort.start_date), JSON.parse(String(cohort.holiday_dates_json || '[]'))).some((day) => !day.holiday && day.classDate === date);
        });
        cohort = candidates.length === 1 ? candidates[0] : matchedCohorts[0];
      }
      if (!cohort) { log(`→ ${m.topic}: expected one scheduled workshop mapping, found 0; leaving Zoom recording untouched`); continue; }
    const ageMinutes = (Date.now() - new Date(m.start_time).getTime()) / 60000 - Number(m.duration || 0);
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
    if (!speaker || !gallery) {
      log(`→ ${m.topic}: both Speaker and Gallery are required; leaving Zoom untouched`);
      continue;
    }
    // If Zoom has listed a desired view but has not finished that file yet,
    // wait rather than uploading one view and marking the meeting complete.
    if ((hasRecordingType('shared_screen_with_speaker_view', 'active_speaker', 'speaker_view') && !speaker) ||
        (hasRecordingType('shared_screen_with_gallery_view', 'gallery_view') && !gallery)) {
      log(`→ ${m.topic}: one or more MP4 views are still processing; waiting for the next run`);
      continue;
    }
    const dl = (f) => { const url = new URL(f.download_url); url.searchParams.set('access_token', zt); return url.toString(); };
    const dateLabel = new Intl.DateTimeFormat('en-CA', { timeZone: String(cohort.timezone || 'Asia/Kolkata'), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(m.start_time));
    const result = { _id: m.uuid, topic: m.topic, startTime: m.start_time, youtube: {}, youtubeUrls: {}, bunny: {}, uploadedAt: new Date() };
    const prior = existing || {};
    const youtubeId = (url) => String(url || '').match(/youtu\.be\/([^?/#]+)/)?.[1] || String(url || '').match(/[?&]v=([^&#]+)/)?.[1] || null;
    if (prior.youtube_speaker_url) { result.youtube.speaker = youtubeId(prior.youtube_speaker_url); result.youtubeUrls.speaker = prior.youtube_speaker_url; }
    if (prior.youtube_gallery_url) { result.youtube.gallery = youtubeId(prior.youtube_gallery_url); result.youtubeUrls.gallery = prior.youtube_gallery_url; }
    const storagePath = (url) => {
      if (!url) return null;
      const s = String(url);
      if (s.includes('mediadelivery.net') || s.includes('video.bunnycdn.com')) return s;
      if (s.startsWith('http://') || s.startsWith('https://')) {
        try {
          return decodeURI(new URL(s).pathname).replace(/^\//, '');
        } catch {
          return s;
        }
      }
      return s;
    };
    if (prior.bunny_speaker_url) result.bunny.speaker = storagePath(prior.bunny_speaker_url);
    const metadata = JSON.parse(String(prior.metadata_json || '{}'));
    if (metadata.bunnyAudioUrl) result.bunny.audio = storagePath(metadata.bunnyAudioUrl);
    const persist = () => syncToWorkshopDatabase(String(m.id), m.uuid, dateLabel, result.youtube, result.youtubeUrls, result.bunny, bunnyClient, cohort);
    log(`→ ${m.topic} (${dateLabel}) speaker=${speaker?.recording_type || 'none'} gallery=${gallery?.recording_type || 'none'}`);

    // YouTube: 1 speaker view (with or without screen sharing) and same one gallery view
    if (yt) {
      for (const [f, view, key] of [[speaker, 'Speaker View', 'speaker'], [gallery, 'Gallery View', 'gallery']]) {
        if (!f || result.youtube[key]) continue;
        try {
          const id = await ytUpload(yt, dl(f), f.file_size, `${m.topic} — ${view} — ${dateLabel}`, `${m.topic}\nRecorded ${m.start_time}\n${view} (${f.recording_type})`);
          result.youtube[key] = id;
          result.youtubeUrls[key] = `https://youtu.be/${id}`;
          await persist();
          log(`  YT OK ${view}: ${result.youtubeUrls[key]}`);
          try {
            await autoAddYoutubeToConfiguredCommunity(
              id, m.topic, dateLabel, String(m.id), bunnyClient,
              `https://img.youtube.com/vi/${id}/hqdefault.jpg`, key === 'speaker' ? 'speaker_view' : 'gallery_view'
            );
          } catch (e) {
            log(`  YouTube community FAIL ${view}:`, e.message);
          }
        } catch (e) {
          process.exitCode = 1;
          log(`  YT FAIL ${view}:`, e.message);
        }
      }
    } else {
      log(`  YouTube skipped for ${m.topic} (${dateLabel}): YouTube account not connected or refresh token expired`);
    }

    if (!YOUTUBE_ONLY) {
      // Historical Gallery URLs remain stored; new Bunny uploads are Speaker only.
      // Route video into dedicated Bunny Stream language collection (Hindi, English, or Marathi)
      const collectionId = getCollectionIdForTopic(`${cohort?.name || ''} ${m.topic || ''}`);
      const langName = collectionId === BUNNY_STREAM_COLLECTIONS.MARATHI ? 'Marathi'
        : collectionId === BUNNY_STREAM_COLLECTIONS.ENGLISH ? 'English'
        : 'Hindi';

      for (const [f, view, key] of [[speaker, 'Speaker View', 'speaker']]) {
        if (!f || result.bunny[key]) continue;
        const videoTitle = `${cohort?.name || m.topic} — ${view} — ${dateLabel}`;
        let streamUploaded = false;

        // 1. Bunny Stream: direct player URL in Hindi, English, or Marathi collection
        if (process.env.BUNNY_API_KEY) {
          try {
            log(`  Bunny Stream uploading to [${langName}] collection: "${videoTitle}"...`);
            const streamRes = await bunnyStreamSave(dl(f), f.file_size, videoTitle, collectionId);
            result.bunny[key] = streamRes.playUrl;
            result.bunny.streamVideoId = streamRes.guid;
            result.bunny.streamEmbedUrl = streamRes.embedUrl;
            streamUploaded = true;
            await persist();
            log(`  Bunny Stream OK ${view} [${langName}]:`, streamRes.playUrl);

            const ytId = result.youtube[key];
            const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
            await autoAddToConfiguredCommunity(
              streamRes.playUrl, m.topic, dateLabel, String(m.id),
              bunnyClient, thumb, key === 'speaker' ? 'speaker_view' : 'gallery_view'
            );
          } catch (streamErr) {
            log(`  Bunny Stream FAIL ${view}:`, streamErr.message);
          }
        }

        // 2. Bunny Storage fallback (if Bunny Stream upload failed or was skipped)
        if (!streamUploaded && process.env.BUNNY_ZOOM_STORAGE_KEY) {
          try {
            const bunnyPath = await bunnyStorageSave(dl(f), f.file_size, `${dateLabel} ${m.uuid.replace(/[^a-zA-Z0-9_-]/g, '-')} ${m.topic} (${key}).mp4`);
            result.bunny[key] = bunnyPath;
            await persist();
            log(`  Bunny Storage OK ${view}:`, bunnyPath);
            const ytId = result.youtube[key];
            const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
            await autoAddToConfiguredCommunity(
              bunnyCdnUrl(bunnyPath), m.topic, dateLabel, String(m.id),
              bunnyClient, thumb, key === 'speaker' ? 'speaker_view' : 'gallery_view'
            );
          } catch (e) { log(`  Bunny Storage FAIL ${view}:`, e.message); }
        }
      }
      if (!result.bunny.audio) {
        try {
          const audioSource = (m.recording_files || []).find(f => f.file_type === 'M4A' && isReady(f)) || speaker;
          const audioPath = await withRecordingMp3(dl(audioSource), async (file, size) => {
            const zone = process.env.BUNNY_ZOOM_STORAGE_ZONE || 'swaryogadb';
            const key = process.env.BUNNY_ZOOM_STORAGE_KEY;
            if (!key) throw new Error('BUNNY_ZOOM_STORAGE_KEY is required');
            const dest = `zoom-videos/${dateLabel}-${m.uuid.replace(/[^a-zA-Z0-9_-]/g, '-')}-audio.mp3`;
            const upload = await fetch(`https://storage.bunnycdn.com/${zone}/${encodeURI(dest)}`, {
              method: 'PUT', headers: { AccessKey: key, 'Content-Type': 'audio/mpeg', 'Content-Length': String(size) },
              body: fs.createReadStream(file), duplex: 'half', signal: AbortSignal.timeout(30 * 60 * 1000),
            });
            if (!upload.ok) throw new Error(`Bunny MP3 upload failed (${upload.status})`);
            return dest;
          });
          result.bunny.audio = audioPath;
          await persist();
          log('  Bunny MP3 OK');
        } catch (error) { log('  Bunny MP3 FAIL:', error.message); }
      }
    }

    // Add newly uploaded videos to the workshop's YouTube playlist (unlisted)
    if (yt && (result.youtube.speaker || result.youtube.gallery)) {
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

    // Persist successful partial destinations immediately. A YouTube quota or
    // transient API failure must not hide Bunny URLs that were uploaded
    // successfully; the next worker run can retry only the missing YouTube view.
    if (Object.keys(result.youtube).length || Object.keys(result.bunny).length) {
      await persist();
    }

    if (!YOUTUBE_ONLY && recordingComplete(result)) {
      await finalizeRecording(result, persist, async () => {
        if (!m.fromZoomTrash && (process.env.DELETE_AFTER_UPLOAD || 'trash') !== 'off') {
          await trashRecording(m.uuid, zt);
          result.trashed = true;
          log('  Zoom recording → trash ✓');
        }
      });
      // Update the YouTube account doc in Bunny DB with this meeting
      try {
        if (ytDoc && (ytDoc._id || ytDoc.document_id)) {
          const uploadedMeetings = ytDoc.metadata?.uploadedMeetings || [];
          const meetingEntry = { uuid: m.uuid, zoomMeetingId: String(m.id), topic: m.topic, startTime: m.start_time, youtube: result.youtube, youtubeUrls: result.youtubeUrls, bunny: result.bunny, trashed: !!result.trashed, at: new Date().toISOString() };
          const existingIndex = uploadedMeetings.findIndex(entry => entry.uuid === m.uuid);
          if (existingIndex < 0) uploadedMeetings.push(meetingEntry);
          else uploadedMeetings[existingIndex] = meetingEntry;
          ytDoc.metadata = { ...(ytDoc.metadata || {}), uploadedMeetings };
          await bunnyClient.execute({
            sql: "UPDATE social_media_accounts_sql SET data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE document_id = ?",
            args: [JSON.stringify(ytDoc), String(ytDoc._id || ytDoc.document_id || '')],
          });
          log('  Bunny DB: uploadedMeetings updated');
        }
      } catch (e) {
        log('  Bunny uploadedMeetings update warning:', e.message);
      }

      processed++;
    }
    } catch (error) {
      log(`Meeting ${m.uuid} failed; retained for retry:`, error.message);
      process.exitCode = 1;
    }
  }
  bunnyClient.close();
  log('uploader done. newly uploaded meetings:', processed);
})().catch((e) => { log('FATAL', e.message); process.exit(1); });
