CREATE TABLE IF NOT EXISTS broadcast_lists_sql (
  document_id TEXT PRIMARY KEY,
  list_key TEXT NOT NULL,
  name TEXT,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  created_by_user_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_sql_list_key
  ON broadcast_lists_sql (list_key);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_sql_name
  ON broadcast_lists_sql (name);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_sql_created_by_user_id
  ON broadcast_lists_sql (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_sql_enabled
  ON broadcast_lists_sql (enabled);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_sql_updated
  ON broadcast_lists_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_sql_created
  ON broadcast_lists_sql (created_at);
