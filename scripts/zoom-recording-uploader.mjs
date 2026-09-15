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
 * Idempotent: tracks done meetings in `zoom_recording_uploads` (main DB) keyed by
 * the Zoom meeting UUID, so it never re-uploads. Safe to run as often as you like.
 *
 * Designed to run on the bridge server (Node, big files OK) via cron — NOT Vercel.
 *
 * Required env:
 *   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_USER_EMAIL (host)
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN (optional; otherwise uses the admin YouTube connection)
 *   MONGODB_URI_MAIN, MONGODB_MAIN_DB_NAME (default swaryogaDB)
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
import mongoose from 'mongoose';

// Load env from .env.zoom-uploader at the repo root (best-effort, no dotenv dep).
try {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.zoom-uploader');
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
} catch { /* no env file — rely on process env */ }

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
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' },
    body: JSON.stringify({ snippet: { title: title.slice(0, 99), description: desc, categoryId: '22' }, status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false } }),
  });
  if (!init.ok) throw new Error('yt init ' + init.status + ' ' + await init.text());
  const loc = init.headers.get('location');
  if (!loc) throw new Error('no upload url');
  const src = await fetch(srcUrl);
  if (!src.ok) throw new Error('zoom dl ' + src.status);
  const put = await fetch(loc, { method: 'PUT', headers: { 'Content-Length': String(size), 'Content-Type': 'video/mp4' }, body: src.body, duplex: 'half' });
  const j = await put.json();
  if (!put.ok) throw new Error('yt put ' + put.status + ' ' + JSON.stringify(j));
  return j.id;
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

// Look up the Zoom meeting → community/playlist mapping by meeting ID.
async function getZoomMapping(zoomMeetingId, Accounts) {
  try {
    const ytAccount = await Accounts.findOne({ platform: 'youtube' }, { projection: { 'metadata.zoomMappings': 1 } });
    const mappings = ytAccount?.metadata?.zoomMappings || [];
    return mappings.find((mp) => mp.zoomMeetingId === zoomMeetingId) || null;
  } catch {
    return null;
  }
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
async function autoAddToConfiguredCommunity(videoUrl, topic, dateLabel, zoomMeetingId, db, thumbnailUrl, recordingType) {
  const Videos = db.collection('communityvideos');
  const Accounts = db.collection('socialmediaaccounts');

  let communityId = 'global'; // default fallback
  let communityName = 'Global';
  let batchName = null; // Batch / Workshop Name from the mapping (the "playlist")
  let thumb = thumbnailUrl || null;

  // Look up the zoom meeting ID in socialmediaaccounts.metadata.zoomMappings
  try {
    const ytAccount = await Accounts.findOne({ platform: 'youtube' });
    const mappings = ytAccount?.metadata?.zoomMappings || [];
    const mapping = mappings.find((m) => m.zoomMeetingId === zoomMeetingId);
    if (mapping) {
      communityId = mapping.communityId;
      communityName = mapping.communityName || mapping.communityId;
      batchName = mapping.zoomTopic || null;
      if (mapping.thumbnailUrl) thumb = mapping.thumbnailUrl; // batch-specific thumbnail
      log(`  Zoom mapping found: ${zoomMeetingId} → ${communityName}`);
    } else {
      log(`  No mapping for Zoom meeting ${zoomMeetingId}, using default 'global'`);
    }
  } catch (e) {
    log(`  Zoom mapping lookup failed, falling back to 'global':`, e.message);
  }

  // Group recordings into the configured batch (folder/playlist), numbering
  // each new recording "Video N" in series — same convention as manually
  // uploaded recordings in the Recordings & Videos admin page.
  const playlistName = batchName || dateLabel;
  const playlistTag = `playlist:${playlistName}`;

  try {
    const existing = await Videos.findOne({ communityId, s3Url: videoUrl });
    if (existing) return;

    const videoNumber = (await Videos.countDocuments({ communityId, tags: playlistTag })) + 1;
    const title = `${communityName} > ${playlistName} > Video ${videoNumber}`;

    const doc = {
      communityId,
      videoSource: 'bunny',
      s3Url: videoUrl,
      title,
      description: `Zoom recording from ${dateLabel}`,
      thumbnailUrl: thumb,
      uploadedBy: 'zoom-uploader',
      isShareable: false,
      isCommon: true,
      source: 'zoom',
      zoomMeetingId,
      recordingType,
      tags: [`folder:${communityName}`, playlistTag, 'recording', `video:${videoNumber}`],
      createdAt: new Date(),
    };

    await Videos.insertOne(doc);
    log(`  Community (${communityName}) OK: added as "${title}" (Bunny)`);
  } catch (e) {
    log(`  Community FAIL:`, e.message);
  }
}

// Add the unlisted YouTube copy to the same community as an ordered Day N
// recording. Speaker and Gallery views from one Zoom meeting share one day
// number; the next meeting gets the next available day number.
async function autoAddYoutubeToConfiguredCommunity(youtubeVideoId, topic, dateLabel, zoomMeetingId, db, thumbnailUrl, recordingType) {
  const Videos = db.collection('communityvideos');
  const Accounts = db.collection('socialmediaaccounts');

  let communityId = 'global';
  let communityName = 'Global';
  let playlistName = dateLabel;
  let configuredThumbnail = thumbnailUrl || null;

  try {
    const ytAccount = await Accounts.findOne({ platform: 'youtube' });
    const mapping = (ytAccount?.metadata?.zoomMappings || []).find(
      (m) => m.zoomMeetingId === zoomMeetingId
    );
    if (mapping) {
      communityId = mapping.communityId;
      communityName = mapping.communityName || mapping.communityId;
      playlistName = mapping.zoomTopic || dateLabel;
      configuredThumbnail = mapping.thumbnailUrl || configuredThumbnail;
    }
  } catch (e) {
    log(`  YouTube community mapping lookup failed:`, e.message);
  }

  const playlistTag = `playlist:${playlistName}`;
  const existingSameMeeting = await Videos.findOne({
    communityId,
    zoomMeetingId,
    tags: playlistTag,
  }, { projection: { tags: 1 } });
  const existingDay = existingSameMeeting?.tags?.find((tag) => /^day:\d+$/.test(tag));

  let dayNumber = existingDay ? Number(existingDay.slice(4)) : 0;
  if (!dayNumber) {
    const existing = await Videos.find({ communityId, tags: playlistTag }, { projection: { tags: 1 } }).toArray();
    dayNumber = existing.reduce((max, video) => {
      const dayTag = video.tags?.find((tag) => /^day:\d+$/.test(tag));
      return Math.max(max, dayTag ? Number(dayTag.slice(4)) : 0);
    }, 0) + 1;
  }

  const existingVideo = await Videos.findOne({ communityId, youtubeVideoId });
  if (existingVideo) {
    log(`  YouTube community already has ${youtubeVideoId}; skipping duplicate`);
    return;
  }

  const viewName = recordingType === 'speaker_view' ? 'Speaker View' : 'Gallery View';
  const youtubeUrl = `https://youtu.be/${youtubeVideoId}`;
  const title = `${communityName} > ${playlistName} > Day ${dayNumber} - ${viewName}`;
  await Videos.insertOne({
    communityId,
    title,
    description: `Day ${dayNumber} recording from ${dateLabel} (${viewName})`,
    videoSource: 'youtube',
    youtubeVideoId,
    youtubeUrl,
    youtubeUnlisted: true,
    thumbnailUrl: configuredThumbnail || `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
    uploadedBy: 'zoom-uploader',
    isShareable: false,
    isCommon: true,
    source: 'youtube_recording',
    zoomMeetingId,
    recordingType,
    tags: [`folder:${communityName}`, playlistTag, `day:${dayNumber}`, 'recording', 'youtube'],
    createdAt: new Date(),
  });
  log(`  YouTube community OK: added "${title}" (${youtubeUrl})`);
}

// Save the MP4 into the Bunny STORAGE zone under zoom-videos/ (a real folder),
// streaming straight from Zoom — no temp file on disk.
async function bunnyStorageSave(srcUrl, size, fileName) {
  const zone = process.env.BUNNY_ZOOM_STORAGE_ZONE || 'swaryogadb';
  const key = process.env.BUNNY_ZOOM_STORAGE_KEY;
  if (!key) { log('Bunny Storage: missing BUNNY_ZOOM_STORAGE_KEY, skip'); return null; }
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 180);
  const dest = `zoom-videos/${safe}`;
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

// Public CDN URL for a Bunny Storage path (storage zone is fronted by this pull zone).
function bunnyCdnUrl(dest) {
  const host = process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net';
  return `https://${host}/${encodeURI(dest)}`;
}

(async () => {
  log('uploader start (lookback', LOOKBACK, 'days)');
  const zt = await zoomToken();
  const host = process.env.ZOOM_USER_EMAIL || 'me';
  const to = new Date();
  const from = new Date(Date.now() - LOOKBACK * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const r = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(host)}/recordings?from=${fmt(from)}&to=${fmt(to)}&page_size=100`, { headers: { Authorization: `Bearer ${zt}` } });
  const meetings = (await r.json()).meetings || [];
  const selectedMeetings = TARGET_MEETING_ID
    ? meetings.filter((meeting) => String(meeting.id) === TARGET_MEETING_ID)
    : meetings;
  if (TARGET_MEETING_ID) log('target meeting filter:', TARGET_MEETING_ID, 'matched', selectedMeetings.length);
  log('found', selectedMeetings.length, 'recorded meeting(s) in window');

  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB' });
  const Accounts = mongoose.connection.db.collection('socialmediaaccounts');
  const ytDoc = await Accounts.findOne({ platform: 'youtube' });
  if (!ytDoc?.refreshToken) { log('No YouTube account connected — aborting.'); await mongoose.disconnect(); return; }
  const yt = await getYouTubeAccessToken(ytDoc);
  // Idempotency without a new collection (Atlas is at its 500-collection cap):
  // track done meetings as an array on the YouTube account doc's metadata.
  const done = new Set((ytDoc.metadata?.uploadedMeetings || []).map((u) => u.uuid));

  let processed = 0;
  for (const m of selectedMeetings) {
    if (done.has(m.uuid)) continue; // already uploaded
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
    log(`→ ${m.topic} (${dateLabel}) speaker=${speaker?.recording_type || 'none'} gallery=${gallery?.recording_type || 'none'}`);

    for (const [f, view, key] of [[speaker, 'Speaker View', 'speaker'], [gallery, 'Gallery View', 'gallery']]) {
      if (!f) continue;
      try {
        const id = await ytUpload(yt, dl(f), f.file_size, `${m.topic} — ${view} — ${dateLabel}`, `${m.topic}\nRecorded ${m.start_time}\n${view} (${f.recording_type})`);
        result.youtube[key] = id;
        result.youtubeUrls[key] = `https://youtu.be/${id}`;
        log(`  YT OK ${view}: ${result.youtubeUrls[key]}`);
        try {
          await autoAddYoutubeToConfiguredCommunity(
            id, m.topic, dateLabel, String(m.id), mongoose.connection.db,
            `https://img.youtube.com/vi/${id}/hqdefault.jpg`, key === 'speaker' ? 'speaker_view' : 'gallery_view'
          );
        } catch (e) {
          log(`  YouTube community FAIL ${view}:`, e.message);
        }
      } catch (e) { log(`  YT FAIL ${view}:`, e.message); }
    }
    for (const [f, view, key] of [[speaker, 'Speaker View', 'speaker'], [gallery, 'Gallery View', 'gallery']]) {
      if (!f) continue;
      try {
        const bunnyPath = await bunnyStorageSave(dl(f), f.file_size, `${dateLabel} ${m.topic} (${key}).mp4`);
        result.bunny[key] = bunnyPath;
        log(`  Bunny Storage OK ${view}:`, bunnyPath);
        const ytId = result.youtube[key];
        const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
        await autoAddToConfiguredCommunity(
          bunnyCdnUrl(bunnyPath), m.topic, dateLabel, String(m.id),
          mongoose.connection.db, thumb, key === 'speaker' ? 'speaker_view' : 'gallery_view'
        );
      } catch (e) { log(`  Bunny FAIL ${view}:`, e.message); }
    }
    // Add newly uploaded videos to the workshop's YouTube playlist (unlisted),
    // creating the playlist on demand. The mapping's youtubePlaylistName can use
    // {MONTH} / {YEAR} placeholders (e.g. "Swar Yoga 7 days {MONTH} {YEAR} Eveining Hindi")
    // so each month's recordings land in their own auto-created playlist.
    if (result.youtube.speaker || result.youtube.gallery) {
      try {
        const mapping = await getZoomMapping(String(m.id), Accounts);
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
    // Mark done only after every available selected view is uploaded to both
    // YouTube and Bunny. This also prevents Zoom cleanup when Bunny storage
    // is temporarily unavailable.
    // If Zoom was still processing one view, the meeting was skipped above and
    // will be picked up on a later run.
    const expectedYoutubeKeys = [speaker && 'speaker', gallery && 'gallery'].filter(Boolean);
    const allYoutubeUploaded = expectedYoutubeKeys.length > 0 && expectedYoutubeKeys.every((key) => result.youtube[key]);
    const allBunnyStored = expectedYoutubeKeys.every((key) => result.bunny[key]);
    if (allYoutubeUploaded && allBunnyStored) {
      // After a successful upload, move the cloud recording to Zoom trash
      // (frees cloud storage; recoverable ~30 days). Disable with DELETE_AFTER_UPLOAD=off.
      if ((process.env.DELETE_AFTER_UPLOAD || 'trash') !== 'off') {
        try { await trashRecording(m.uuid, zt); result.trashed = true; log('  Zoom recording → trash ✓'); }
        catch (e) { log('  Zoom trash FAIL:', e.message); }
      }
      await Accounts.updateOne({ _id: ytDoc._id }, { $push: { 'metadata.uploadedMeetings': { uuid: m.uuid, zoomMeetingId: String(m.id), topic: m.topic, startTime: m.start_time, youtube: result.youtube, youtubeUrls: result.youtubeUrls, bunny: result.bunny, trashed: !!result.trashed, at: new Date() } } });
      processed++;
    }
  }
  await mongoose.disconnect();
  log('uploader done. newly uploaded meetings:', processed);
})().catch((e) => { log('FATAL', e.message); process.exit(1); });
