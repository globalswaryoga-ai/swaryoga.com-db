-- Preserved Community data in Bunny SQL. JSON keeps the complete legacy UI contract.
CREATE TABLE IF NOT EXISTS community_members_sql (
  document_id TEXT PRIMARY KEY,
  community_id TEXT,
  user_id TEXT,
  status TEXT,
  approved INTEGER NOT NULL DEFAULT 1,
  joined_at TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_community_members_scope ON community_members_sql(community_id,status,joined_at DESC);
CREATE TABLE IF NOT EXISTS community_videos_sql (
  document_id TEXT PRIMARY KEY,
  community_id TEXT,
  title TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_community_videos_scope ON community_videos_sql(community_id,created_at DESC);
CREATE TABLE IF NOT EXISTS community_posts_sql (
  document_id TEXT PRIMARY KEY,
  community_id TEXT,
  user_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS community_watch_logs_sql (
  document_id TEXT PRIMARY KEY,
  community_id TEXT,
  user_id TEXT,
  video_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS community_experiences_sql (
  document_id TEXT PRIMARY KEY,
  user_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS community_questions_sql (
  document_id TEXT PRIMARY KEY,
  user_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
