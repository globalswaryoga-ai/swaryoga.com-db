#!/usr/bin/env node

/** Non-destructive WhatsApp account migration: MongoDB -> Bunny SQL. */
import dotenv from 'dotenv';
import mongodb from 'mongodb';
import { createClient } from '@libsql/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();
const { MongoClient } = mongodb;
const { EJSON } = mongodb.BSON;
const dryRun = new Set(process.argv.slice(2)).has('--dry-run');
const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
if (!mongoUri) throw new Error('MONGODB_URI_MAIN or MONGODB_URI is required');
if (!process.env.BUNNY_DATABASE_URL || !process.env.BUNNY_DATABASE_AUTH_TOKEN) throw new Error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required');
const json = (value) => EJSON.stringify(value, null, 0, { relaxed: false });
const id = (value) => value?.toHexString?.() || String(value ?? crypto.randomUUID());
const iso = (value) => value ? new Date(value).toISOString() : null;
async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
  await mongo.connect();
  try {
    const db = mongo.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const accounts = await db.collection('whatsapp_accounts').find({}).toArray();
    console.log(JSON.stringify({ sourceCounts: { whatsappAccounts: accounts.length }, dryRun }, null, 2));
    if (dryRun) return;
    const migration = await fs.readFile(path.join(process.cwd(), 'migrations/0021_whatsapp_accounts_sql.sql'), 'utf8');
    for (const statement of migration.split(';').map((s) => s.trim()).filter(Boolean)) await bunny.execute(statement);
    await bunny.execute({ sql: 'INSERT INTO __bunny_migrations (version,filename,checksum) VALUES (?,?,?) ON CONFLICT(version) DO UPDATE SET filename=excluded.filename,checksum=excluded.checksum', args: ['0021', '0021_whatsapp_accounts_sql.sql', crypto.createHash('sha256').update(migration).digest('hex')] });
    for (const account of accounts) {
      await bunny.execute({ sql: `INSERT INTO whatsapp_accounts_sql (document_id,account_type,created_by_user_id,meta_phone_number_id,meta_phone_number,is_active,status,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,is_active=excluded.is_active,status=excluded.status,updated_at=excluded.updated_at`, args: [id(account._id), String(account.accountType || 'meta'), String(account.createdByUserId || ''), account.metaPhoneNumberId ? String(account.metaPhoneNumberId) : null, account.metaPhoneNumber ? String(account.metaPhoneNumber) : null, account.isActive === false ? 0 : 1, String(account.status || 'disconnected'), json(account), iso(account.createdAt), iso(account.updatedAt)] });
    }
    console.log(JSON.stringify({ migrated: { whatsappAccounts: accounts.length }, sourceDeleted: false }, null, 2));
  } finally { await mongo.close(); bunny.close(); }
}
main().catch((error) => { console.error('WhatsApp account migration failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
