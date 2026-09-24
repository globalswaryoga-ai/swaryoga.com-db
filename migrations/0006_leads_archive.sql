CREATE TABLE IF NOT EXISTS leads_sql (
  document_id TEXT PRIMARY KEY,
  lead_key TEXT NOT NULL,
  owner_user_id TEXT,
  lead_number TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_sql_lead_key
  ON leads_sql (lead_key);

CREATE INDEX IF NOT EXISTS idx_leads_sql_owner_user_id
  ON leads_sql (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_leads_sql_lead_number
  ON leads_sql (lead_number);

CREATE INDEX IF NOT EXISTS idx_leads_sql_updated
  ON leads_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_leads_sql_created
  ON leads_sql (created_at);
