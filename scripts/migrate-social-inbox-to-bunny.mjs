#!/usr/bin/env node

/** Non-destructive Messenger/Instagram migration: MongoDB -> Bunny SQL. */
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
const firstExistingCollection = async (db, names) => {
  for (const name of names) {
    if ((await db.listCollections({ name }).toArray()).length) return db.collection(name);
  }
  return db.collection(names[0]);
};

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
  await mongo.connect();
  try {
    const db = mongo.db(crmDbName);
    const accountsCollection = await firstExistingCollection(db, ['social_media_accounts', 'socialmediaaccounts']);
    const conversationsCollection = await firstExistingCollection(db, ['social_inbox_conversations']);
    const messagesCollection = await firstExistingCollection(db, ['social_inbox_messages']);
    const [accounts, conversations, messages] = await Promise.all([
      accountsCollection.find({ platform: { $in: ['facebook', 'instagram'] } }).toArray(),
      conversationsCollection.find({ platform: { $in: ['messenger', 'instagram'] } }).toArray(),
      messagesCollection.find({ platform: { $in: ['messenger', 'instagram'] } }).toArray(),
    ]);
    console.log(JSON.stringify({ sourceCollections: { accounts: accountsCollection.collectionName, conversations: conversationsCollection.collectionName, messages: messagesCollection.collectionName }, sourceCounts: { accounts: accounts.length, conversations: conversations.length, messages: messages.length }, dryRun }, null, 2));
    if (dryRun) return;

    const migration = await fs.readFile(path.join(process.cwd(), 'migrations/0024_social_inbox_sql.sql'), 'utf8');
    for (const statement of migration.split(';').map((s) => s.trim()).filter(Boolean)) await bunny.execute(statement);
    const checksum = crypto.createHash('sha256').update(migration).digest('hex');
    await bunny.execute({ sql: 'INSERT INTO __bunny_migrations (name,checksum) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET checksum=excluded.checksum', args: ['0024_social_inbox_sql.sql', checksum] });

    for (const row of accounts) {
      const a = [id(row._id), row.scopeType || 'super_admin', row.scopeKey || 'super_admin', row.ownerUserId || null, row.tenantSlug || null, row.platform || '', row.accountId || '', row.accountName || null, row.accountHandle || null, row.isConnected === false ? 0 : 1, iso(row.connectedAt), iso(row.updatedAt), json(row)];
      await bunny.execute({ sql: `INSERT INTO social_media_accounts_sql (document_id,scope_type,scope_key,owner_user_id,tenant_slug,platform,account_id,account_name,account_handle,is_connected,connected_at,updated_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,is_connected=excluded.is_connected,updated_at=excluded.updated_at`, args: a });
    }
    for (const row of conversations) {
      const a = [id(row._id), row.conversationKey || '', row.platform || '', row.accountScopeType || 'super_admin', row.accountScopeKey || 'super_admin', row.accountId || '', row.participantId || '', row.participantName || null, row.participantUsername || null, row.createdByUserId || null, row.assignedToUserId || null, row.status || null, Number(row.unreadCount || 0), row.lastMessage || null, iso(row.lastMessageAt), row.lastMessageDirection || null, row.isBlocked ? 1 : 0, json(row)];
      await bunny.execute({ sql: `INSERT INTO social_inbox_conversations_sql (document_id,conversation_key,platform,account_scope_type,account_scope_key,account_id,participant_id,participant_name,participant_username,created_by_user_id,assigned_to_user_id,status,unread_count,last_message,last_message_at,last_message_direction,is_blocked,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,last_message=excluded.last_message,last_message_at=excluded.last_message_at,unread_count=excluded.unread_count`, args: a });
    }
    for (const row of messages) {
      const a = [id(row._id), id(row.conversationId), row.conversationKey || '', row.platform || '', row.accountScopeType || 'super_admin', row.accountScopeKey || 'super_admin', row.accountId || '', row.externalMessageId || null, row.senderId || null, row.recipientId || null, row.direction || 'inbound', row.messageType || 'text', row.isRead ? 1 : 0, iso(row.sentAt), json(row)];
      await bunny.execute({ sql: `INSERT INTO social_inbox_messages_sql (document_id,conversation_document_id,conversation_key,platform,account_scope_type,account_scope_key,account_id,external_message_id,sender_id,recipient_id,direction,message_type,is_read,sent_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,is_read=excluded.is_read`, args: a });
    }
    console.log(JSON.stringify({ migrated: { accounts: accounts.length, conversations: conversations.length, messages: messages.length }, sourceDeleted: false }, null, 2));
  } finally {
    await mongo.close();
    bunny.close();
  }
}
main().catch((error) => { console.error('Social inbox migration failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
