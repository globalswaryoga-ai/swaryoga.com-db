-- Bunny SQL admin authentication.
-- Passwords remain bcrypt hashes; plaintext passwords are never stored.
CREATE TABLE IF NOT EXISTS admin_users_sql (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 1,
  role TEXT,
  permissions_json TEXT NOT NULL DEFAULT '[]',
  permissions_v2_json TEXT,
  managed_user_ids_json TEXT NOT NULL DEFAULT '[]',
  tenant_slug TEXT,
  name TEXT,
  phone TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT,
  updated_at TEXT,
  last_login_at TEXT,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  UNIQUE(email)
);
CREATE INDEX IF NOT EXISTS idx_admin_users_sql_user_id ON admin_users_sql(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_sql_email ON admin_users_sql(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_sql_tenant_slug ON admin_users_sql(tenant_slug);

CREATE TABLE IF NOT EXISTS admin_signins_sql (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_signins_sql_email ON admin_signins_sql(email);
CREATE INDEX IF NOT EXISTS idx_admin_signins_sql_created_at ON admin_signins_sql(created_at);
