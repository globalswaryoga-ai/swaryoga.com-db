import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export type BunnyZoomMapping = {
  _id: string;
  zoomMeetingId: string;
  communityId: string;
  communityName?: string;
  zoomTopic?: string;
  thumbnailUrl?: string;
  youtubePlaylistName?: string;
  createdAt?: string;
  updatedAt?: string;
};

function map(row: any): BunnyZoomMapping {
  return { _id: String(row.id), zoomMeetingId: String(row.zoom_meeting_id), communityId: String(row.community_id), communityName: row.community_name || undefined, zoomTopic: row.zoom_topic || undefined, thumbnailUrl: row.thumbnail_url || undefined, youtubePlaylistName: row.youtube_playlist_name || undefined, createdAt: row.created_at || undefined, updatedAt: row.updated_at || undefined };
}

export async function initBunnyZoomSchema() {
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS zoom_community_mappings_sql (id TEXT PRIMARY KEY,zoom_meeting_id TEXT NOT NULL UNIQUE,community_id TEXT NOT NULL,community_name TEXT,zoom_topic TEXT,thumbnail_url TEXT,youtube_playlist_name TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_zoom_community_sql_community ON zoom_community_mappings_sql(community_id)', args: [] },
  ]);
}

export async function listBunnyZoomMappings() { await initBunnyZoomSchema(); const result = await bunnyExecute('SELECT * FROM zoom_community_mappings_sql ORDER BY created_at DESC'); return result.rows.map(map); }
export async function getBunnyZoomMapping(id: string) { await initBunnyZoomSchema(); const result = await bunnyExecute({ sql: 'SELECT * FROM zoom_community_mappings_sql WHERE id = ?', args: [id] }); return result.rows[0] ? map(result.rows[0]) : null; }
export async function createBunnyZoomMapping(input: Omit<BunnyZoomMapping, '_id'>) { await initBunnyZoomSchema(); const createdAt = new Date().toISOString(); const id = crypto.randomUUID(); await bunnyExecute({ sql: `INSERT INTO zoom_community_mappings_sql (id,zoom_meeting_id,community_id,community_name,zoom_topic,thumbnail_url,youtube_playlist_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`, args: [id,input.zoomMeetingId,input.communityId,input.communityName || null,input.zoomTopic || null,input.thumbnailUrl || null,input.youtubePlaylistName || null,createdAt,createdAt] }); return getBunnyZoomMapping(id); }
export async function updateBunnyZoomMapping(id: string, fields: Partial<Omit<BunnyZoomMapping, '_id'>>) { await initBunnyZoomSchema(); const allowed: Record<string, string> = { communityId: 'community_id', communityName: 'community_name', zoomTopic: 'zoom_topic', thumbnailUrl: 'thumbnail_url', youtubePlaylistName: 'youtube_playlist_name' }; const entries = Object.entries(fields).filter(([key, value]) => allowed[key] && value !== undefined); if (!entries.length) return getBunnyZoomMapping(id); await bunnyExecute({ sql: `UPDATE zoom_community_mappings_sql SET ${entries.map(([key]) => `${allowed[key]} = ?`).join(', ')},updated_at=? WHERE id=?`, args: [...entries.map(([, value]) => value || null), new Date().toISOString(), id] }); return getBunnyZoomMapping(id); }
export async function deleteBunnyZoomMapping(id: string) { await initBunnyZoomSchema(); const result = await bunnyExecute({ sql: 'DELETE FROM zoom_community_mappings_sql WHERE id = ?', args: [id] }); return result.rowsAffected > 0; }
