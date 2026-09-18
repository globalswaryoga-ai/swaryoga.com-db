-- Bunny SQL Zoom → Community mappings and community metadata used by Zoom setup.
CREATE TABLE IF NOT EXISTS zoom_community_mappings_sql (
  id TEXT PRIMARY KEY,
  zoom_meeting_id TEXT NOT NULL UNIQUE,
  community_id TEXT NOT NULL,
  community_name TEXT,
  zoom_topic TEXT,
  thumbnail_url TEXT,
  youtube_playlist_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_zoom_community_sql_community ON zoom_community_mappings_sql(community_id);
CREATE INDEX IF NOT EXISTS idx_zoom_community_sql_created ON zoom_community_mappings_sql(created_at);
