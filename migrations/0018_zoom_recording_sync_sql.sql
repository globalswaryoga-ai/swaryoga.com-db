-- Bunny SQL ledger for Zoom recording downloads/uploads.
CREATE TABLE IF NOT EXISTS zoom_recording_sync_sql (
  id TEXT PRIMARY KEY,
  zoom_meeting_id TEXT NOT NULL,
  zoom_meeting_uuid TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  host_id TEXT,
  start_time TEXT,
  duration INTEGER,
  total_size INTEGER,
  synced_files_json TEXT NOT NULL DEFAULT '[]',
  skipped_files_json TEXT NOT NULL DEFAULT '[]',
  errors_json TEXT NOT NULL DEFAULT '[]',
  sync_status TEXT NOT NULL DEFAULT 'pending',
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  workshop_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_zoom_recording_sync_sql_synced_at ON zoom_recording_sync_sql(synced_at);
CREATE INDEX IF NOT EXISTS idx_zoom_recording_sync_sql_topic ON zoom_recording_sync_sql(topic);
