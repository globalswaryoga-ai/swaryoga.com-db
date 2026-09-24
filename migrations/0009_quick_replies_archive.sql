CREATE TABLE IF NOT EXISTS quick_replies_sql (
  document_id TEXT PRIMARY KEY,
  reply_key TEXT NOT NULL,
  title TEXT,
  shortcut TEXT,
  creator_user_id TEXT,
  enabled INTEGER DEFAULT 1,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_reply_key
  ON quick_replies_sql (reply_key);

CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_title
  ON quick_replies_sql (title);

CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_creator_user_id
  ON quick_replies_sql (creator_user_id);

CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_enabled
  ON quick_replies_sql (enabled);

CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_updated
  ON quick_replies_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_created
  ON quick_replies_sql (created_at);
