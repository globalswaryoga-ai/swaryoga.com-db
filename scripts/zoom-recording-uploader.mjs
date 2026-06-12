#!/usr/bin/env node
/**
 * Zoom recording → YouTube (+ Bunny) auto-uploader.
 *
 * Rule:
 *   • YouTube (Private): Speaker view + Gallery view.
 *       - Prefer the WITH-screen version when the class shared a screen, else plain.
 *   • Bunny Storage: Speaker view only (with or without screen share), saved as an
 *     MP4 file under the `zoom-videos/` folder of the storage zone.
 *
 * Idempotent: tracks done meetings in `zoom_recording_uploads` (main DB) keyed by
 * the Zoom meeting UUID, so it never re-uploads. Safe to run as often as you like.
 *
 * Designed to run on the bridge server (Node, big files OK) via cron — NOT Vercel.
 *
 * Required env:
 *   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_USER_EMAIL (host)
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   MONGODB_URI_MAIN, MONGODB_MAIN_DB_NAME (default swaryogaDB)
 *   ENCRYPTION_KEY   (same key prod used to encrypt the YouTube refresh token)
 *   BUNNY_ZOOM_STORAGE_ZONE (default swaryogadb), BUNNY_ZOOM_STORAGE_KEY
 *   RECORDING_LOOKBACK_DAYS (default 2)
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

async function ytUpload(access, srcUrl, size, title, desc) {
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' },
    body: JSON.stringify({ snippet: { title: title.slice(0, 99), description: desc, categoryId: '22' }, status: { privacyStatus: 'private', selfDeclaredMadeForKids: false } }),
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

// Auto-add speaker view video to the configured community.
// User will manually invite swarsakshi9@gmail.com + mohan@swaryoga.com in YouTube Studio.
async function autoAddToConfiguredCommunity(videoId, topic, dateLabel, zoomMeetingId, db) {
  const Videos = db.collection('communityvideos');
  const Accounts = db.collection('socialmediaaccounts');

  let communityId = 'global'; // default fallback
  let communityName = 'Global';
  // hqdefault always exists; maxresdefault 404s for many recordings.
  let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Look up the zoom meeting ID in socialmediaaccounts.metadata.zoomMappings
  try {
    const ytAccount = await Accounts.findOne({ platform: 'youtube' });
    const mappings = ytAccount?.metadata?.zoomMappings || [];
    const mapping = mappings.find((m) => m.zoomMeetingId === zoomMeetingId);
    if (mapping) {
      communityId = mapping.communityId;
      communityName = mapping.communityName || mapping.communityId;
      if (mapping.thumbnailUrl) thumbnailUrl = mapping.thumbnailUrl; // batch-specific thumbnail
      log(`  Zoom mapping found: ${zoomMeetingId} → ${communityName}`);
    } else {
      log(`  No mapping for Zoom meeting ${zoomMeetingId}, using default 'global'`);
    }
  } catch (e) {
    log(`  Zoom mapping lookup failed, falling back to 'global':`, e.message);
  }

  const doc = {
    communityId,
    videoSource: 'youtube',
    youtubeVideoId: videoId,
    youtubeUnlisted: false,
    title: `${topic} — ${dateLabel}`,
    description: `Zoom recording from ${dateLabel}\n\nPlease invite swarsakshi9@gmail.com and mohan@swaryoga.com in YouTube Studio so they receive shareable links.`,
    thumbnailUrl,
    uploadedBy: 'zoom-uploader',
    isShareable: false,
    isCommon: true,
    source: 'zoom',
    recordingType: 'speaker_view',
    tags: ['zoom', 'recording'],
    pendingEmailInvites: ['swarsakshi9@gmail.com', 'mohan@swaryoga.com'],
    createdAt: new Date(),
  };

  try {
    const existing = await Videos.findOne({ communityId, youtubeVideoId: videoId });
    if (!existing) {
      await Videos.insertOne(doc);
      log(`  Community (${communityName}) OK: video added with pending email invites`);
    }
  } catch (e) {
    log(`  Community FAIL:`, e.message);
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

(async () => {
  log('uploader start (lookback', LOOKBACK, 'days)');
  const zt = await zoomToken();
  const host = process.env.ZOOM_USER_EMAIL || 'me';
  const to = new Date();
  const from = new Date(Date.now() - LOOKBACK * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const r = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(host)}/recordings?from=${fmt(from)}&to=${fmt(to)}&page_size=100`, { headers: { Authorization: `Bearer ${zt}` } });
  const meetings = (await r.json()).meetings || [];
  log('found', meetings.length, 'recorded meeting(s) in window');

  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB' });
  const Accounts = mongoose.connection.db.collection('socialmediaaccounts');
  const ytDoc = await Accounts.findOne({ platform: 'youtube' });
  if (!ytDoc?.refreshToken) { log('No YouTube account connected — aborting.'); await mongoose.disconnect(); return; }
  const yt = await ytAccessToken(decrypt(ytDoc.refreshToken));
  // Idempotency without a new collection (Atlas is at its 500-collection cap):
  // track done meetings as an array on the YouTube account doc's metadata.
  const done = new Set((ytDoc.metadata?.uploadedMeetings || []).map((u) => u.uuid));

  let processed = 0;
  for (const m of meetings) {
    if (done.has(m.uuid)) continue; // already uploaded
    const mp4 = (m.recording_files || []).filter((f) => f.file_type === 'MP4');
    if (!mp4.length) continue;
    const pick = (...t) => { for (const x of t) { const f = mp4.find((y) => y.recording_type === x); if (f) return f; } return null; };
    const speaker = pick('shared_screen_with_speaker_view', 'active_speaker', 'speaker_view');
    const gallery = pick('shared_screen_with_gallery_view', 'gallery_view');
    const dl = (f) => `${f.download_url}?access_token=${zt}`;
    const dateLabel = m.start_time.slice(0, 10);
    const result = { _id: m.uuid, topic: m.topic, startTime: m.start_time, youtube: {}, bunny: null, uploadedAt: new Date() };
    log(`→ ${m.topic} (${dateLabel}) speaker=${speaker?.recording_type || 'none'} gallery=${gallery?.recording_type || 'none'}`);

    for (const [f, view, key] of [[speaker, 'Speaker View', 'speaker'], [gallery, 'Gallery View', 'gallery']]) {
      if (!f) continue;
      try {
        const id = await ytUpload(yt, dl(f), f.file_size, `${m.topic} — ${view} — ${dateLabel}`, `${m.topic}\nRecorded ${m.start_time}\n${view} (${f.recording_type})`);
        result.youtube[key] = id;
        log(`  YT OK ${view}: https://youtu.be/${id}`);
        // Auto-add speaker view to configured community with pending email invites
        if (key === 'speaker') {
          await autoAddToConfiguredCommunity(id, m.topic, dateLabel, String(m.id), mongoose.connection.db);
        }
      } catch (e) { log(`  YT FAIL ${view}:`, e.message); }
    }
    if (speaker) {
      try { result.bunny = await bunnyStorageSave(dl(speaker), speaker.file_size, `${dateLabel} ${m.topic} (speaker).mp4`); log('  Bunny Storage OK:', result.bunny); }
      catch (e) { log('  Bunny FAIL:', e.message); }
    }
    // Only mark done if at least one YouTube upload succeeded (so failures retry next run).
    if (result.youtube.speaker || result.youtube.gallery) {
      // After a successful upload, move the cloud recording to Zoom trash
      // (frees cloud storage; recoverable ~30 days). Disable with DELETE_AFTER_UPLOAD=off.
      if ((process.env.DELETE_AFTER_UPLOAD || 'trash') !== 'off') {
        try { await trashRecording(m.uuid, zt); result.trashed = true; log('  Zoom recording → trash ✓'); }
        catch (e) { log('  Zoom trash FAIL:', e.message); }
      }
      await Accounts.updateOne({ _id: ytDoc._id }, { $push: { 'metadata.uploadedMeetings': { uuid: m.uuid, topic: m.topic, startTime: m.start_time, youtube: result.youtube, bunny: result.bunny, trashed: !!result.trashed, at: new Date() } } });
      processed++;
    }
  }
  await mongoose.disconnect();
  log('uploader done. newly uploaded meetings:', processed);
})().catch((e) => { log('FATAL', e.message); process.exit(1); });
