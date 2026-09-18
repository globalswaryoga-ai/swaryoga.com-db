-- Meta/common WhatsApp account ownership and encrypted credentials.
-- Credentials remain encrypted in data_json and are never returned to clients.
CREATE TABLE IF NOT EXISTS whatsapp_accounts_sql (
  document_id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL DEFAULT 'meta',
  created_by_user_id TEXT NOT NULL,
  meta_phone_number_id TEXT,
  meta_phone_number TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  status TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_owner ON whatsapp_accounts_sql(created_by_user_id, account_type, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_accounts_meta_phone_id ON whatsapp_accounts_sql(meta_phone_number_id) WHERE meta_phone_number_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_meta_phone ON whatsapp_accounts_sql(meta_phone_number);
