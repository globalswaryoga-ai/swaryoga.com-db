#!/usr/bin/env node

/**
 * Non-destructive QR WhatsApp migration: MongoDB -> Bunny SQL.
 * MongoDB is read only; this script never deletes or updates source records.
 * Run with --dry-run to inspect counts without writing SQL.
 */
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

function json(value) { return EJSON.stringify(value, null, 0, { relaxed: false }); }
function id(value) { return value?.toHexString?.() || String(value ?? crypto.randomUUID()); }
function iso(value) { return value ? new Date(value).toISOString() : null; }
async function ddl(bunny) {
  const migration = await fs.readFile(path.join(process.cwd(), 'migrations/0019_qr_whatsapp_sql.sql'), 'utf8');
  for (const statement of migration.split(';').map((s) => s.trim()).filter(Boolean)) await bunny.execute(statement);
  await bunny.execute({
    sql: 'INSERT INTO __bunny_migrations (version,filename,checksum) VALUES (?,?,?) ON CONFLICT(version) DO UPDATE SET filename=excluded.filename,checksum=excluded.checksum',
    args: ['0019', '0019_qr_whatsapp_sql.sql', crypto.createHash('sha256').update(migration).digest('hex')],
  });
}
async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
  await mongo.connect();
  try {
    const db = mongo.db(crmDbName);
    const [messages, chats, manifests, usage] = await Promise.all([
      db.collection('qr_whatsapp_messages').find({}).toArray(),
      db.collection('qr_whatsapp_chats').find({}).toArray(),
      db.collection('qr_whatsapp_archive_manifest').find({}).toArray(),
      db.collection('qr_whatsapp_storage_usage').find({}).toArray(),
    ]);
    console.log(JSON.stringify({ sourceCounts: { messages: messages.length, chats: chats.length, archiveManifest: manifests.length, storageUsage: usage.length }, dryRun }, null, 2));
    if (dryRun) return;
    await ddl(bunny);
    for (const row of chats) await bunny.execute({ sql: `INSERT INTO qr_chats_sql (user_id,connected_phone,chat_jid,conversation_timestamp,archived,pinned,unread_count,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid) DO UPDATE SET data_json=excluded.data_json,conversation_timestamp=excluded.conversation_timestamp,archived=excluded.archived,pinned=excluded.pinned,unread_count=excluded.unread_count,updated_at=excluded.updated_at`, args: [String(row.userId), String(row.connectedPhone), String(row.chatJid), Number(row.conversationTimestamp || 0), row.archived ? 1 : 0, row.pinned ? 1 : 0, Number(row.unreadCount || 0), json(row), iso(row.createdAt), iso(row.updatedAt)] });
    for (const row of messages) await bunny.execute({ sql: `INSERT INTO qr_messages_sql (user_id,connected_phone,chat_jid,message_id,timestamp,direction,status,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid,message_id) DO UPDATE SET data_json=excluded.data_json,timestamp=excluded.timestamp,status=CASE WHEN excluded.status > qr_messages_sql.status THEN excluded.status ELSE qr_messages_sql.status END,updated_at=excluded.updated_at`, args: [String(row.userId), String(row.connectedPhone), String(row.chatJid), String(row.messageId || id(row._id)), Number(row.timestamp || 0), String(row.direction || 'inbound'), Number(row.status || 0), json(row), iso(row.createdAt), iso(row.updatedAt)] });
    for (const row of manifests) await bunny.execute({ sql: `INSERT INTO qr_archive_manifest_sql (user_id,connected_phone,chat_jid,date_key,bunny_path,byte_size,message_count,archived_at,data_json) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid,date_key) DO UPDATE SET bunny_path=excluded.bunny_path,byte_size=excluded.byte_size,message_count=excluded.message_count,archived_at=excluded.archived_at,data_json=excluded.data_json`, args: [String(row.userId), String(row.connectedPhone), String(row.chatJid), String(row.dateKey), String(row.bunnyPath), Number(row.byteSize || 0), Number(row.messageCount || 0), iso(row.archivedAt), json(row)] });
    for (const row of usage) await bunny.execute({ sql: `INSERT INTO qr_storage_usage_sql (user_id,connected_phone,bunny_bytes,bunny_file_count,bunny_message_count,last_archived_at,last_purged_at,data_json) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone) DO UPDATE SET bunny_bytes=excluded.bunny_bytes,bunny_file_count=excluded.bunny_file_count,bunny_message_count=excluded.bunny_message_count,last_archived_at=excluded.last_archived_at,last_purged_at=excluded.last_purged_at,data_json=excluded.data_json`, args: [String(row.userId), String(row.connectedPhone), Number(row.bunnyBytes || 0), Number(row.bunnyFileCount || 0), Number(row.bunnyMessageCount || 0), iso(row.lastArchivedAt), iso(row.lastPurgedAt), json(row)] });
    console.log(JSON.stringify({ migrated: { messages: messages.length, chats: chats.length, archiveManifest: manifests.length, storageUsage: usage.length }, sourceDeleted: false }, null, 2));
  } finally { await mongo.close(); bunny.close(); }
}
main().catch((error) => { console.error('QR migration failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
