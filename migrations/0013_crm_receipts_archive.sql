CREATE TABLE IF NOT EXISTS crm_receipts_sql (
  document_id TEXT PRIMARY KEY,
  receipt_key TEXT NOT NULL,
  lead_id TEXT,
  lead_number TEXT,
  receipt_number TEXT,
  issued_by_user_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  workshop_name TEXT,
  status TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_receipt_key ON crm_receipts_sql (receipt_key);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_lead_id ON crm_receipts_sql (lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_lead_number ON crm_receipts_sql (lead_number);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_receipt_number ON crm_receipts_sql (receipt_number);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_issued_by_user_id ON crm_receipts_sql (issued_by_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_customer_phone ON crm_receipts_sql (customer_phone);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_customer_email ON crm_receipts_sql (customer_email);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_workshop_name ON crm_receipts_sql (workshop_name);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_created_at ON crm_receipts_sql (created_at);
CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_updated_at ON crm_receipts_sql (updated_at);
