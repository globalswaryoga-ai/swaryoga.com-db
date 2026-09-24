CREATE TABLE IF NOT EXISTS lead_followups_sql (
  document_id TEXT PRIMARY KEY,
  followup_key TEXT NOT NULL,
  lead_id TEXT,
  owner_user_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_followups_sql_followup_key
  ON lead_followups_sql (followup_key);

CREATE INDEX IF NOT EXISTS idx_lead_followups_sql_lead_id
  ON lead_followups_sql (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_followups_sql_owner_user_id
  ON lead_followups_sql (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_lead_followups_sql_updated
  ON lead_followups_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_lead_followups_sql_created
  ON lead_followups_sql (created_at);
