-- QR WhatsApp runtime and archive metadata for Bunny SQL.
-- JSON is retained alongside indexed identity columns so legacy fields remain
-- available to the UI while the application contract is migrated safely.
CREATE TABLE IF NOT EXISTS __bunny_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qr_sessions_sql (
  session_key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  connected_phone TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_user_phone ON qr_sessions_sql(user_id, connected_phone);

CREATE TABLE IF NOT EXISTS qr_chats_sql (
  user_id TEXT NOT NULL,
  connected_phone TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  conversation_timestamp INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  PRIMARY KEY(user_id, connected_phone, chat_jid)
);
CREATE INDEX IF NOT EXISTS idx_qr_chats_sort ON qr_chats_sql(user_id, connected_phone, archived, conversation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_qr_chats_unread ON qr_chats_sql(user_id, connected_phone, unread_count);

CREATE TABLE IF NOT EXISTS qr_messages_sql (
  user_id TEXT NOT NULL,
  connected_phone TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  message_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'inbound',
  status INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  PRIMARY KEY(user_id, connected_phone, chat_jid, message_id)
);
CREATE INDEX IF NOT EXISTS idx_qr_messages_chat_time ON qr_messages_sql(user_id, connected_phone, chat_jid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_qr_messages_session_time ON qr_messages_sql(user_id, connected_phone, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_qr_messages_status ON qr_messages_sql(message_id, user_id, connected_phone, status);

CREATE TABLE IF NOT EXISTS qr_archive_manifest_sql (
  user_id TEXT NOT NULL,
  connected_phone TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  date_key TEXT NOT NULL,
  bunny_path TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  data_json TEXT NOT NULL,
  PRIMARY KEY(user_id, connected_phone, chat_jid, date_key)
);
CREATE INDEX IF NOT EXISTS idx_qr_archive_lookup ON qr_archive_manifest_sql(user_id, connected_phone, chat_jid, date_key);
CREATE INDEX IF NOT EXISTS idx_qr_archive_purge ON qr_archive_manifest_sql(date_key);

CREATE TABLE IF NOT EXISTS qr_storage_usage_sql (
  user_id TEXT NOT NULL,
  connected_phone TEXT NOT NULL,
  bunny_bytes INTEGER NOT NULL DEFAULT 0,
  bunny_file_count INTEGER NOT NULL DEFAULT 0,
  bunny_message_count INTEGER NOT NULL DEFAULT 0,
  last_archived_at TEXT,
  last_purged_at TEXT,
  data_json TEXT NOT NULL,
  PRIMARY KEY(user_id, connected_phone)
);

CREATE TABLE IF NOT EXISTS qr_message_queue_sql (
  queue_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  connected_phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_qr_queue_user_status ON qr_message_queue_sql(user_id, status, updated_at);
