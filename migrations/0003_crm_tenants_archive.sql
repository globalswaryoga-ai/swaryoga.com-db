CREATE TABLE IF NOT EXISTS crm_tenants_sql (
  tenant_slug TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_tenants_sql_updated
  ON crm_tenants_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_crm_tenants_sql_created
  ON crm_tenants_sql (created_at);
