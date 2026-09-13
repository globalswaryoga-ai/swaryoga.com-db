CREATE TABLE IF NOT EXISTS lead_notes_sql (
  document_id TEXT PRIMARY KEY,
  note_key TEXT NOT NULL,
  lead_id TEXT,
  owner_user_id TEXT,
  pinned INTEGER DEFAULT 0,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_sql_note_key
  ON lead_notes_sql (note_key);

CREATE INDEX IF NOT EXISTS idx_lead_notes_sql_lead_id
  ON lead_notes_sql (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_notes_sql_owner_user_id
  ON lead_notes_sql (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_lead_notes_sql_pinned
  ON lead_notes_sql (pinned);

CREATE INDEX IF NOT EXISTS idx_lead_notes_sql_updated
  ON lead_notes_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_lead_notes_sql_created
  ON lead_notes_sql (created_at);
