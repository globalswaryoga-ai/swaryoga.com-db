-- Messenger / Instagram accounts, conversations, and messages in Bunny SQL.
-- data_json preserves every Mongo field for lossless migration and rollback.
CREATE TABLE IF NOT EXISTS social_media_accounts_sql (
  document_id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL DEFAULT 'super_admin',
  scope_key TEXT NOT NULL DEFAULT 'super_admin',
  owner_user_id TEXT,
  tenant_slug TEXT,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT,
  account_handle TEXT,
  is_connected INTEGER NOT NULL DEFAULT 1,
  connected_at TEXT,
  updated_at TEXT,
  data_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_scope_platform_account
  ON social_media_accounts_sql(scope_type, scope_key, platform, account_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_connected
  ON social_media_accounts_sql(is_connected, platform);

CREATE TABLE IF NOT EXISTS social_inbox_conversations_sql (
  document_id TEXT PRIMARY KEY,
  conversation_key TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_scope_type TEXT NOT NULL DEFAULT 'super_admin',
  account_scope_key TEXT NOT NULL DEFAULT 'super_admin',
  account_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  participant_name TEXT,
  participant_username TEXT,
  created_by_user_id TEXT,
  assigned_to_user_id TEXT,
  status TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message TEXT,
  last_message_at TEXT,
  last_message_direction TEXT,
  is_blocked INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_conversations_scope_key
  ON social_inbox_conversations_sql(account_scope_type, account_scope_key, conversation_key);
CREATE INDEX IF NOT EXISTS idx_social_conversations_list
  ON social_inbox_conversations_sql(account_scope_type, account_scope_key, platform, unread_count DESC, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_conversations_participant
  ON social_inbox_conversations_sql(platform, account_id, participant_id);

CREATE TABLE IF NOT EXISTS social_inbox_messages_sql (
  document_id TEXT PRIMARY KEY,
  conversation_document_id TEXT,
  conversation_key TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_scope_type TEXT NOT NULL DEFAULT 'super_admin',
  account_scope_key TEXT NOT NULL DEFAULT 'super_admin',
  account_id TEXT NOT NULL,
  external_message_id TEXT,
  sender_id TEXT,
  recipient_id TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound',
  message_type TEXT NOT NULL DEFAULT 'text',
  is_read INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  data_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_messages_external
  ON social_inbox_messages_sql(platform, account_scope_type, account_scope_key, external_message_id);
CREATE INDEX IF NOT EXISTS idx_social_messages_conversation
  ON social_inbox_messages_sql(conversation_key, account_scope_type, account_scope_key, sent_at);
CREATE INDEX IF NOT EXISTS idx_social_messages_account
  ON social_inbox_messages_sql(platform, account_scope_type, account_scope_key, sent_at DESC);
