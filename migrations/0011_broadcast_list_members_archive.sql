CREATE TABLE IF NOT EXISTS broadcast_list_members_sql (
  document_id TEXT PRIMARY KEY,
  list_member_key TEXT NOT NULL,
  broadcast_list_id TEXT,
  lead_id TEXT,
  phone_number TEXT,
  created_by_user_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_sql_list_member_key
  ON broadcast_list_members_sql (list_member_key);

CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_sql_broadcast_list_id
  ON broadcast_list_members_sql (broadcast_list_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_sql_lead_id
  ON broadcast_list_members_sql (lead_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_sql_phone_number
  ON broadcast_list_members_sql (phone_number);

CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_sql_created_by_user_id
  ON broadcast_list_members_sql (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_sql_updated
  ON broadcast_list_members_sql (updated_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_sql_created
  ON broadcast_list_members_sql (created_at);
