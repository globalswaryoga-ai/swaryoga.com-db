CREATE TABLE IF NOT EXISTS broadcast_runs_sql (
  document_id TEXT PRIMARY KEY,
  broadcast_run_key TEXT NOT NULL,
  name TEXT,
  created_by_user_id TEXT,
  created_by_label TEXT,
  mode TEXT,
  provider TEXT,
  status TEXT,
  template_id TEXT,
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_broadcast_run_key ON broadcast_runs_sql (broadcast_run_key);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_name ON broadcast_runs_sql (name);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_created_by_user_id ON broadcast_runs_sql (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_provider ON broadcast_runs_sql (provider);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_status ON broadcast_runs_sql (status);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_template_id ON broadcast_runs_sql (template_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_scheduled_at ON broadcast_runs_sql (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_started_at ON broadcast_runs_sql (started_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_completed_at ON broadcast_runs_sql (completed_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_created_at ON broadcast_runs_sql (created_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_updated_at ON broadcast_runs_sql (updated_at);
