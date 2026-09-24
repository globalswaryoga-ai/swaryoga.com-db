#!/usr/bin/env node

/** Non-destructive Meta WhatsApp migration: MongoDB -> Bunny SQL. */
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
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
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
    const db = mongo.db(crmDbName);
    const [messages, events] = await Promise.all([
      db.collection('whatsapp_messages').find({ provider: { $in: ['meta', null] } }).toArray(),
      db.collection('whatsapp_webhook_events').find({}).toArray(),
    ]);
    console.log(JSON.stringify({ sourceCounts: { metaMessages: messages.length, webhookEvents: events.length }, dryRun }, null, 2));
    if (dryRun) return;
    const migration = await fs.readFile(path.join(process.cwd(), 'migrations/0020_meta_whatsapp_sql.sql'), 'utf8');
    for (const statement of migration.split(';').map((s) => s.trim()).filter(Boolean)) await bunny.execute(statement);
    await bunny.execute({ sql: 'INSERT INTO __bunny_migrations (name,checksum) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET checksum=excluded.checksum', args: ['0020_meta_whatsapp_sql.sql', crypto.createHash('sha256').update(migration).digest('hex')] });
    for (const row of messages) {
      const documentId = id(row._id || row.waMessageId);
      await bunny.execute({ sql: `INSERT INTO meta_messages_sql (document_id,lead_id,phone_number,provider,direction,message_type,status,wa_message_id,sender_number,sent_at,created_at,updated_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,updated_at=excluded.updated_at`, args: [documentId, row.leadId ? id(row.leadId) : null, String(row.phoneNumber || ''), 'meta', String(row.direction || 'outbound'), String(row.messageType || 'text'), String(row.status || 'queued'), row.waMessageId ? String(row.waMessageId) : null, row.senderNumber ? String(row.senderNumber) : null, iso(row.sentAt), iso(row.createdAt), iso(row.updatedAt) || new Date().toISOString(), json(row)] });
    }
    console.log(JSON.stringify({ migrated: { metaMessages: messages.length, webhookEvents: events.length }, sourceDeleted: false }, null, 2));
  } finally { await mongo.close(); bunny.close(); }
}
main().catch((error) => { console.error('Meta migration failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
