#!/usr/bin/env node

/**
 * Migrate the small, low-risk CRM user settings collection into Bunny SQL.
 *
 * This is the first production-safe module migration step while MongoDB remains
 * the live runtime database. The SQL table is archival and read-optimized.
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

if (!mongoUri) throw new Error('MONGODB_URI_MAIN or MONGODB_URI is required');
if (!bunnyUrl || !bunnyToken) throw new Error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required');

function documentId(document) {
  const value = document?._id;
  if (value && typeof value.toHexString === 'function') return value.toHexString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  return String(value ?? 'missing-id');
}

function safeJson(document) {
  return EJSON.stringify(document, null, 0, { relaxed: false });
}

async function ensureTable(client) {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS crm_user_settings_sql (
      user_id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  });

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_crm_user_settings_sql_updated
      ON crm_user_settings_sql (updated_at)`,
  });

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_crm_user_settings_sql_created
      ON crm_user_settings_sql (created_at)`,
  });
}

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: bunnyUrl, authToken: bunnyToken });

  await mongo.connect();
  try {
    const crmDb = mongo.db(crmDbName);
    const collection = crmDb.collection('crm_user_settings');

    if (!dryRun) {
      await ensureTable(bunny);
      if (reset) {
        console.log('Resetting crm_user_settings_sql');
        await bunny.execute('DELETE FROM crm_user_settings_sql');
      }
    }

    const docs = await collection.find({}).toArray();
    console.log(`Found ${docs.length} crm_user_settings documents`);

    if (dryRun) {
      console.log('Dry run complete. No SQL rows were changed.');
      return;
    }

    let inserted = 0;
    for (const doc of docs) {
      const userId = doc.userId || doc._id?.toString();
      if (!userId) continue;

      const json = safeJson(doc);
      const createdAt = doc.createdAt ? new Date(doc.createdAt).toISOString() : null;
      const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null;

      await bunny.execute({
        sql: `INSERT INTO crm_user_settings_sql (user_id, document_id, data_json, created_at, updated_at, migrated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET
            document_id = excluded.document_id,
            data_json = excluded.data_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            migrated_at = CURRENT_TIMESTAMP`,
        args: [String(userId), documentId(doc), json, createdAt, updatedAt],
      });

      inserted += 1;
    }

    console.log(`Migrated ${inserted} crm_user_settings rows into Bunny SQL`);
  } finally {
    await mongo.close();
    bunny.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
