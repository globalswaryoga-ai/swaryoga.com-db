-- Meta WhatsApp messages and webhook events in Bunny SQL.
-- Keep the complete legacy document in data_json so no UI fields are lost.
CREATE TABLE IF NOT EXISTS meta_messages_sql (
  document_id TEXT PRIMARY KEY,
  lead_id TEXT,
  phone_number TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'meta',
  direction TEXT NOT NULL DEFAULT 'outbound',
  message_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'queued',
  wa_message_id TEXT,
  sender_number TEXT,
  sent_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meta_messages_phone_time ON meta_messages_sql(phone_number, sent_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_messages_lead_time ON meta_messages_sql(lead_id, sent_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_messages_provider ON meta_messages_sql(provider, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_messages_wa_id ON meta_messages_sql(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_meta_messages_owner ON meta_messages_sql(sent_by_user_id);

CREATE TABLE IF NOT EXISTS meta_webhook_events_sql (
  document_id TEXT PRIMARY KEY,
  event_key TEXT,
  phone_number TEXT,
  wa_message_id TEXT,
  kind TEXT,
  ok INTEGER NOT NULL DEFAULT 1,
  received_at TEXT,
  data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_received ON meta_webhook_events_sql(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_message ON meta_webhook_events_sql(wa_message_id);
