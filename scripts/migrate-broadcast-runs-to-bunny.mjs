#!/usr/bin/env node

/**
 * Preserve MongoDB broadcast_runs documents in Bunny SQL.
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

function broadcastRunKey(doc) {
  const name = doc?.name || 'unknown-broadcast';
  const createdBy = doc?.createdByUserId || 'unknown-user';
  const provider = doc?.provider || 'unknown-provider';
  const scheduled = doc?.scheduledAt || doc?.createdAt || 'unknown-scheduled';
  return `${String(name)}:${String(createdBy)}:${String(provider)}:${String(scheduled)}`;
}

async function ensureTable(client) {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS broadcast_runs_sql (
      document_id TEXT PRIMARY KEY,
      broadcast_run_key TEXT NOT NULL,
      name TEXT,
      created_by_user_id TEXT,
      created_by_label TEXT,
      mode TEXT,
      provider TEXT,
      status TEXT,
      template_id TEXT,
      scheduled_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  });

  await client.execute({ sql: `DROP INDEX IF EXISTS idx_broadcast_runs_sql_broadcast_run_key` }).catch(() => {});
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_broadcast_run_key ON broadcast_runs_sql (broadcast_run_key)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_name ON broadcast_runs_sql (name)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_created_by_user_id ON broadcast_runs_sql (created_by_user_id)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_provider ON broadcast_runs_sql (provider)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_status ON broadcast_runs_sql (status)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_template_id ON broadcast_runs_sql (template_id)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_scheduled_at ON broadcast_runs_sql (scheduled_at)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_started_at ON broadcast_runs_sql (started_at)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_completed_at ON broadcast_runs_sql (completed_at)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_created_at ON broadcast_runs_sql (created_at)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_broadcast_runs_sql_updated_at ON broadcast_runs_sql (updated_at)` });
}

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: bunnyUrl, authToken: bunnyToken });

  await mongo.connect();
  try {
    const crmDb = mongo.db(crmDbName);
    const collection = crmDb.collection('broadcast_runs');

    if (!dryRun) {
      await ensureTable(bunny);
      if (reset) {
        console.log('Resetting broadcast_runs_sql');
        await bunny.execute('DELETE FROM broadcast_runs_sql');
      }
    }

    const docs = await collection.find({}).toArray();
    console.log(`Found ${docs.length} broadcast_runs documents`);

    if (dryRun) {
      console.log('Dry run complete. No SQL rows were changed.');
      return;
    }

    let inserted = 0;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const statements = chunk.map((doc) => ({
        sql: `INSERT INTO broadcast_runs_sql (
          document_id,
          broadcast_run_key,
          name,
          created_by_user_id,
          created_by_label,
          mode,
          provider,
          status,
          template_id,
          scheduled_at,
          started_at,
          completed_at,
          data_json,
          created_at,
          updated_at,
          migrated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(document_id) DO UPDATE SET
          broadcast_run_key = excluded.broadcast_run_key,
          name = excluded.name,
          created_by_user_id = excluded.created_by_user_id,
          created_by_label = excluded.created_by_label,
          mode = excluded.mode,
          provider = excluded.provider,
          status = excluded.status,
          template_id = excluded.template_id,
          scheduled_at = excluded.scheduled_at,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at,
          data_json = excluded.data_json,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          migrated_at = CURRENT_TIMESTAMP`,
        args: [
          documentId(doc),
          broadcastRunKey(doc),
          doc.name || null,
          doc.createdByUserId || null,
          doc.createdByLabel || null,
          doc.mode || null,
          doc.provider || null,
          doc.status || null,
          doc.templateId || null,
          dateValue(doc.scheduledAt),
          dateValue(doc.startedAt),
          dateValue(doc.completedAt),
          safeJson(doc),
          dateValue(doc.createdAt),
          dateValue(doc.updatedAt),
        ],
      }));

      await bunny.batch(statements, 'write');
      inserted += chunk.length;
      console.log(`Migrated ${inserted}/${docs.length} broadcast_runs rows into Bunny SQL`);
    }

    console.log(`Migrated ${inserted} broadcast_runs rows into Bunny SQL`);
  } finally {
    await mongo.close();
    bunny.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
