import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export type BunnyAdminUser = {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  isAdmin: boolean;
  role?: string;
  permissions: string[];
  permissionsV2: Record<string, unknown> | null;
  managedUserIds: string[];
  tenantSlug?: string;
  name?: string;
  phone?: string;
};

function parse<T>(value: unknown, fallback: T): T {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
}

function mapUser(row: any): BunnyAdminUser {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    email: String(row.email).toLowerCase(),
    passwordHash: String(row.password_hash),
    isAdmin: row.is_admin === 1 || row.is_admin === true,
    role: row.role || undefined,
    permissions: parse(row.permissions_json, []),
    permissionsV2: parse(row.permissions_v2_json, null),
    managedUserIds: parse(row.managed_user_ids_json, []),
    tenantSlug: row.tenant_slug || undefined,
    name: row.name || undefined,
    phone: row.phone || undefined,
  };
}

export async function initBunnyAuthSchema() {
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS admin_users_sql (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,email TEXT NOT NULL,password_hash TEXT NOT NULL,is_admin INTEGER NOT NULL DEFAULT 1,role TEXT,permissions_json TEXT NOT NULL DEFAULT '[]',permissions_v2_json TEXT,managed_user_ids_json TEXT NOT NULL DEFAULT '[]',tenant_slug TEXT,name TEXT,phone TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT,updated_at TEXT,last_login_at TEXT,migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id),UNIQUE(email))`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_admin_users_sql_user_id ON admin_users_sql(user_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_admin_users_sql_email ON admin_users_sql(email)', args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS admin_signins_sql (id TEXT PRIMARY KEY,email TEXT NOT NULL,user_id TEXT,ip_address TEXT,user_agent TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_admin_signins_sql_created_at ON admin_signins_sql(created_at)', args: [] },
  ]);
}

export async function findBunnyAdmin(identifier: string) {
  await initBunnyAuthSchema();
  const normalized = identifier.trim().toLowerCase();
  const result = await bunnyExecute({ sql: 'SELECT * FROM admin_users_sql WHERE lower(user_id) = ? OR lower(email) = ? LIMIT 1', args: [normalized, normalized] });
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function recordBunnyAdminSignin(input: { email: string; userId?: string; ipAddress?: string | null; userAgent?: string | null }) {
  await initBunnyAuthSchema();
  const timestamp = new Date().toISOString();
  await bunnyBatch([
    { sql: 'INSERT INTO admin_signins_sql (id,email,user_id,ip_address,user_agent,created_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), input.email, input.userId || null, input.ipAddress || null, input.userAgent || null, timestamp] },
    { sql: 'UPDATE admin_users_sql SET last_login_at = ?, updated_at = ? WHERE user_id = ?', args: [timestamp, timestamp, input.userId || ''] },
  ]);
}
