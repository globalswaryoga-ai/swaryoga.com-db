#!/usr/bin/env node

/**
 * Preserve MongoDB quick_replies documents in Bunny SQL.
 *
 * Safe pattern: document_id is primary key, exact Mongo document is preserved.
 */

import dotenv from 'dotenv';
import mongodb from 'mongodb';
import { createClient } from '@libsql/client';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { MongoClient } = mongodb;
const { EJSON } = mongodb.BSON;

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const bunnyUrl = process.env.BUNNY_DATABASE_URL;
const bunnyToken = process.env.BUNNY_DATABASE_AUTH_TOKEN;
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const reset = args.has('--reset');
const batchSize = Number(process.env.BUNNY_MIGRATION_BATCH_SIZE || 100);

if (!mongoUri) throw new Error('MONGODB_URI_MAIN or MONGODB_URI is required');
if (!bunnyUrl || !bunnyToken) throw new Error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required');
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
  throw new Error('BUNNY_MIGRATION_BATCH_SIZE must be an integer between 1 and 500');
}

function documentId(document) {
  const value = document?._id;
  if (value && typeof value.toHexString === 'function') return value.toHexString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  return String(value ?? 'missing-id');
}

function dateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).toISOString();
  return null;
}

function safeJson(document) {
  return EJSON.stringify(document, null, 0, { relaxed: false });
}

function replyKey(doc) {
  const title = doc?.title || 'untitled';
  const shortcut = doc?.shortcut || 'no-shortcut';
  const created = doc?.createdAt || doc?.created_at || doc?._id?.getTimestamp?.() || 'unknown-created';
  return `${String(doc?.createdByUserId || 'unknown-owner')}:${String(title)}:${String(shortcut)}:${String(created)}`;
}

async function ensureTable(client) {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS quick_replies_sql (
      document_id TEXT PRIMARY KEY,
      reply_key TEXT NOT NULL,
      title TEXT,
      shortcut TEXT,
      creator_user_id TEXT,
      enabled INTEGER DEFAULT 1,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  });

  await client.execute({ sql: `DROP INDEX IF EXISTS idx_quick_replies_sql_reply_key` }).catch(() => {});
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_reply_key ON quick_replies_sql (reply_key)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_title ON quick_replies_sql (title)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_creator_user_id ON quick_replies_sql (creator_user_id)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_enabled ON quick_replies_sql (enabled)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_updated ON quick_replies_sql (updated_at)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_quick_replies_sql_created ON quick_replies_sql (created_at)` });
}

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: bunnyUrl, authToken: bunnyToken });

  await mongo.connect();
  try {
    const crmDb = mongo.db(crmDbName);
    const collection = crmDb.collection('quick_replies');

    if (!dryRun) {
      await ensureTable(bunny);
      if (reset) {
        console.log('Resetting quick_replies_sql');
        await bunny.execute('DELETE FROM quick_replies_sql');
      }
    }

    const docs = await collection.find({}).toArray();
    console.log(`Found ${docs.length} quick_replies documents`);

    if (dryRun) {
      console.log('Dry run complete. No SQL rows were changed.');
      return;
    }

    let inserted = 0;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const statements = chunk.map((doc) => ({
        sql: `INSERT INTO quick_replies_sql (
          document_id,
          reply_key,
          title,
          shortcut,
          creator_user_id,
          enabled,
          data_json,
          created_at,
          updated_at,
          migrated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(document_id) DO UPDATE SET
          reply_key = excluded.reply_key,
          title = excluded.title,
          shortcut = excluded.shortcut,
          creator_user_id = excluded.creator_user_id,
          enabled = excluded.enabled,
          data_json = excluded.data_json,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          migrated_at = CURRENT_TIMESTAMP`,
        args: [
          documentId(doc),
          replyKey(doc),
          doc.title || null,
          doc.shortcut || null,
          doc.createdByUserId || doc.userId || null,
          doc.enabled === false ? 0 : 1,
          safeJson(doc),
          dateValue(doc.createdAt || doc.created_at),
          dateValue(doc.updatedAt || doc.updated_at),
        ],
      }));

      await bunny.batch(statements, 'write');
      inserted += chunk.length;
      console.log(`Migrated ${inserted}/${docs.length} quick_replies rows into Bunny SQL`);
    }

    console.log(`Migrated ${inserted} quick_replies rows into Bunny SQL`);
  } finally {
    await mongo.close();
    bunny.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
