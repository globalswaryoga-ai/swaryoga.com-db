#!/usr/bin/env node

/** Import archived admin password hashes from Bunny's mongo_documents archive into Bunny SQL auth tables. */
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.BUNNY_DATABASE_URL;
const authToken = process.env.BUNNY_DATABASE_AUTH_TOKEN;
if (!url || !authToken) throw new Error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required');
const bunny = createClient({ url, authToken });
const reset = process.argv.includes('--reset');

function json(value, fallback) { return JSON.stringify(value ?? fallback); }
function parse(value, fallback) { try { return value ? JSON.parse(String(value)) : fallback; } catch { return fallback; } }

async function main() {
  await bunny.batch([
    { sql: `CREATE TABLE IF NOT EXISTS admin_users_sql (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,email TEXT NOT NULL,password_hash TEXT NOT NULL,is_admin INTEGER NOT NULL DEFAULT 1,role TEXT,permissions_json TEXT NOT NULL DEFAULT '[]',permissions_v2_json TEXT,managed_user_ids_json TEXT NOT NULL DEFAULT '[]',tenant_slug TEXT,name TEXT,phone TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT,updated_at TEXT,last_login_at TEXT,migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id),UNIQUE(email))`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_admin_users_sql_user_id ON admin_users_sql(user_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_admin_users_sql_email ON admin_users_sql(email)', args: [] },
  ], 'write');
  if (reset) await bunny.execute('DELETE FROM admin_users_sql');
  const archived = await bunny.execute("SELECT document_json FROM mongo_documents WHERE collection_name = 'admin_users'");
  let imported = 0;
  for (const row of archived.rows) {
    const user = parse(row.document_json, null);
    if (!user?.userId || !user?.email || !user?.password) continue;
    await bunny.execute({
      sql: `INSERT INTO admin_users_sql (id,user_id,email,password_hash,is_admin,role,permissions_json,permissions_v2_json,managed_user_ids_json,tenant_slug,name,phone,metadata_json,created_at,updated_at,last_login_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,password_hash=excluded.password_hash,is_admin=excluded.is_admin,role=excluded.role,permissions_json=excluded.permissions_json,permissions_v2_json=excluded.permissions_v2_json,managed_user_ids_json=excluded.managed_user_ids_json,tenant_slug=excluded.tenant_slug,name=excluded.name,phone=excluded.phone,metadata_json=excluded.metadata_json,created_at=excluded.created_at,updated_at=excluded.updated_at,last_login_at=excluded.last_login_at`,
      args: [String(user._id?.$oid || user._id || crypto.randomUUID()), String(user.userId), String(user.email).toLowerCase(), String(user.password), user.isAdmin === false ? 0 : 1, user.role || null, json(user.permissions, []), json(user.permissionsV2, null), json(user.managedUserIds, []), user.tenantSlug || null, user.name || null, user.phone || null, json({ source: 'mongo_documents.admin_users' }, {}), user.createdAt || null, user.updatedAt || null, user.lastLoginAt || null],
    });
    imported += 1;
  }
  console.log(`Imported ${imported} archived admin accounts into Bunny SQL.`);
  bunny.close();
}

main().catch((error) => { console.error('Admin auth migration failed:', error.message); process.exitCode = 1; });
