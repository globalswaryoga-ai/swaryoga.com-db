#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
dotenv.config({ path: '.env.local' }); dotenv.config();
const db = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
const parse = (v) => { try { return JSON.parse(String(v)); } catch { return {}; } };
const str = (v) => v == null ? '' : String(v?.$oid || v);
const num = (v) => Number(v?.$numberInt ?? v?.$numberLong ?? v ?? 0) || 0;
const iso = (v) => { const raw = v?.$date?.$numberLong || v?.$date || v; if (!raw) return null; const d = new Date(Number(raw) || raw); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
async function main() {
  const migration = await fs.readFile(path.join(process.cwd(), 'migrations/0023_meta_archive_manifest_sql.sql'), 'utf8');
  for (const statement of migration.split(';').map((s) => s.trim()).filter(Boolean)) await db.execute(statement);
  await db.execute({ sql: 'INSERT INTO __bunny_migrations (name,checksum) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET checksum=excluded.checksum', args: ['0023_meta_archive_manifest_sql.sql', crypto.createHash('sha256').update(migration).digest('hex')] });
  let total = 0;
  for (let offset = 0; ; offset += 500) {
    const result = await db.execute({ sql: "SELECT document_id,document_json,created_at FROM mongo_documents WHERE collection_name='meta_whatsapp_archive_manifest' ORDER BY document_id LIMIT 500 OFFSET ?", args: [offset] });
    const statements = result.rows.flatMap((source) => { const d = parse(source.document_json); if (!d.phoneNumber || !d.tenantUserId || !d.dateKey) return []; return [{ sql: 'INSERT INTO meta_archive_manifest_sql (document_id,tenant_user_id,phone_number,date_key,bunny_path,byte_size,message_count,archived_at,data_json) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,bunny_path=excluded.bunny_path,byte_size=excluded.byte_size,message_count=excluded.message_count,archived_at=excluded.archived_at', args: [str(d._id) || String(source.document_id), str(d.tenantUserId), str(d.phoneNumber), str(d.dateKey), str(d.bunnyPath), num(d.byteSize), num(d.messageCount), iso(d.archivedAt) || source.created_at, source.document_json] }]; });
    for (let i = 0; i < statements.length; i += 100) await db.batch(statements.slice(i, i + 100), 'write');
    total += result.rows.length; console.log(`processed ${total}`);
    if (result.rows.length < 500) break;
  }
  const count = await db.execute('SELECT COUNT(*) AS count FROM meta_archive_manifest_sql');
  const phones = await db.execute('SELECT COUNT(DISTINCT phone_number) AS phones FROM meta_archive_manifest_sql');
  console.log(JSON.stringify({ manifests: Number(count.rows[0].count), phones: Number(phones.rows[0].phones), sourceDeleted: false }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
