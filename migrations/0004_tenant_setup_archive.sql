CREATE TABLE IF NOT EXISTS tenant_setup_sql (
  tenant_slug TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_setup_sql_updated
  ON tenant_setup_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_tenant_setup_sql_created
  ON tenant_setup_sql (created_at);
