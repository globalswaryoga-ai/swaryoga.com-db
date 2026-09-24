-- Meta WhatsApp cold-history manifest. Payloads remain in Bunny Storage;
-- this table makes archived conversations discoverable without MongoDB.
CREATE TABLE IF NOT EXISTS meta_archive_manifest_sql (
  document_id TEXT PRIMARY KEY,
  tenant_user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  date_key TEXT NOT NULL,
  bunny_path TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  data_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_archive_phone_day ON meta_archive_manifest_sql(tenant_user_id,phone_number,date_key);
CREATE INDEX IF NOT EXISTS idx_meta_archive_phone ON meta_archive_manifest_sql(phone_number,date_key DESC);
