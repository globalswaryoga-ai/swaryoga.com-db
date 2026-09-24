#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
dotenv.config({ path: '.env.local' });
dotenv.config();
const db = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
function parse(value, fallback) { try { return value ? JSON.parse(String(value)) : fallback; } catch { return fallback; } }
(async () => {
  await db.execute(`CREATE TABLE IF NOT EXISTS zoom_community_mappings_sql (id TEXT PRIMARY KEY,zoom_meeting_id TEXT NOT NULL UNIQUE,community_id TEXT NOT NULL,community_name TEXT,zoom_topic TEXT,thumbnail_url TEXT,youtube_playlist_name TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  const rows = await db.execute("SELECT document_json FROM mongo_documents WHERE collection_name='socialmediaaccounts'");
  let imported = 0;
  for (const row of rows.rows) {
    const account = parse(row.document_json, null);
    if (account?.platform !== 'youtube') continue;
    for (const mapping of account.metadata?.zoomMappings || []) {
      if (!mapping?.zoomMeetingId || !mapping?.communityId) continue;
      await db.execute({ sql: `INSERT INTO zoom_community_mappings_sql (id,zoom_meeting_id,community_id,community_name,zoom_topic,thumbnail_url,youtube_playlist_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(zoom_meeting_id) DO UPDATE SET community_id=excluded.community_id,community_name=excluded.community_name,zoom_topic=excluded.zoom_topic,thumbnail_url=excluded.thumbnail_url,youtube_playlist_name=excluded.youtube_playlist_name,updated_at=excluded.updated_at`, args: [String(mapping._id?.$oid || mapping._id || crypto.randomUUID()), String(mapping.zoomMeetingId), String(mapping.communityId), mapping.communityName || null, mapping.zoomTopic || null, mapping.thumbnailUrl || null, mapping.youtubePlaylistName || null, mapping.createdAt || new Date().toISOString(), new Date().toISOString()] });
      imported += 1;
    }
  }
  console.log(`Imported ${imported} Zoom → Community mappings into Bunny SQL.`);
  db.close();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
