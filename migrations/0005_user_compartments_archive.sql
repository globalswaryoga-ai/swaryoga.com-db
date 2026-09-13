CREATE TABLE IF NOT EXISTS user_compartments_sql (
  user_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_compartments_sql_updated
  ON user_compartments_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_user_compartments_sql_created
  ON user_compartments_sql (created_at);
