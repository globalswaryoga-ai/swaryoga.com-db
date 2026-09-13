CREATE TABLE IF NOT EXISTS whatsapp_templates_sql (
  document_id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL,
  template_name TEXT,
  provider TEXT,
  category TEXT,
  language TEXT,
  status TEXT,
  created_by TEXT,
  meta_template_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_template_key ON whatsapp_templates_sql (template_key);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_template_name ON whatsapp_templates_sql (template_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_provider ON whatsapp_templates_sql (provider);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_category ON whatsapp_templates_sql (category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_language ON whatsapp_templates_sql (language);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_status ON whatsapp_templates_sql (status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_created_by ON whatsapp_templates_sql (created_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_meta_template_id ON whatsapp_templates_sql (meta_template_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_created_at ON whatsapp_templates_sql (created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_updated_at ON whatsapp_templates_sql (updated_at);
