-- Bunny Database application foundation.
-- This migration is additive and does not change live MongoDB routes.

CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_hash TEXT NOT NULL,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document', 'audio', 'other')),
  storage_provider TEXT NOT NULL DEFAULT 'bunny_storage',
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  byte_size INTEGER,
  mime_type TEXT,
  owner_user_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (content_hash, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets (content_hash);
CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets (media_type);

CREATE TABLE IF NOT EXISTS sql_cutover_flags (
  module_name TEXT PRIMARY KEY,
  read_source TEXT NOT NULL DEFAULT 'mongodb' CHECK (read_source IN ('mongodb', 'bunny')),
  write_source TEXT NOT NULL DEFAULT 'mongodb' CHECK (write_source IN ('mongodb', 'bunny', 'dual')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO sql_cutover_flags (module_name, notes) VALUES
  ('users', 'Enable only after SQL authentication repository is verified'),
  ('crm_leads', 'Enable only after tenant ownership queries are verified'),
  ('courses_workshops', 'Enable only after enrollment and progress tests pass'),
  ('community_planner', 'Enable only after access-control tests pass'),
  ('payments_accounting', 'Enable only after payment callback replay tests pass'),
  ('automation', 'Enable only after cron idempotency tests pass'),
  ('webhooks', 'Enable only after deduplication tests pass'),
  ('whatsapp', 'Keep Mongo/Hetzner operational state until bridge cutover is proven');

CREATE TABLE IF NOT EXISTS migration_checkpoints (
  source_database TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  last_document_id TEXT,
  documents_seen INTEGER NOT NULL DEFAULT 0,
  documents_written INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_database, collection_name)
);
