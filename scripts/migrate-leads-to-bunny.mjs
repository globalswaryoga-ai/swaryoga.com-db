#!/usr/bin/env node

/**
 * Migrate the high-value leads collection into Bunny SQL.
 *
 * This is the single most important runtime data set for the CRM. We keep
 * MongoDB as the live app database while building a safe, resumable archival copy
 * that can survive the upcoming 10-day runtime cutoff window.
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

function leadKey(document) {
  const owner = document?.createdByUserId || document?.assignedToUserId || 'unknown-owner';
  const leadNumber = document?.leadNumber || document?.leadNo || document?._id?.toString();
  return `${String(owner)}:${String(leadNumber)}`;
}

function safeJson(document) {
  return EJSON.stringify(document, null, 0, { relaxed: false });
}

async function ensureTable(client) {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS leads_sql (
      document_id TEXT PRIMARY KEY,
      lead_key TEXT NOT NULL,
      owner_user_id TEXT,
      lead_number TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  });

  await client.execute({
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_sql_lead_key
      ON leads_sql (lead_key)`,
  });

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_leads_sql_owner_user_id
      ON leads_sql (owner_user_id)`,
  });

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_leads_sql_lead_number
      ON leads_sql (lead_number)`,
  });

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_leads_sql_updated
      ON leads_sql (updated_at)`,
  });

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_leads_sql_created
      ON leads_sql (created_at)`,
  });
}

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: bunnyUrl, authToken: bunnyToken });

  await mongo.connect();
  try {
    const crmDb = mongo.db(crmDbName);
    const collection = crmDb.collection('leads');

    if (!dryRun) {
      await ensureTable(bunny);
      if (reset) {
        console.log('Resetting leads_sql');
        await bunny.execute('DELETE FROM leads_sql');
      }
    }

    const docs = await collection.find({}).toArray();
    console.log(`Found ${docs.length} leads documents`);

    if (dryRun) {
      console.log('Dry run complete. No SQL rows were changed.');
      return;
    }

    let inserted = 0;
    let pending = [];

    for (const doc of docs) {
      const leadId = documentId(doc);
      const key = leadKey(doc);
      if (!leadId || !key) continue;

      const json = safeJson(doc);
      const createdAt = doc.createdAt ? new Date(doc.createdAt).toISOString() : null;
      const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null;

      pending.push({
        sql: `INSERT INTO leads_sql (document_id, lead_key, owner_user_id, lead_number, data_json, created_at, updated_at, migrated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(document_id) DO UPDATE SET
            lead_key = excluded.lead_key,
            owner_user_id = excluded.owner_user_id,
            lead_number = excluded.lead_number,
            data_json = excluded.data_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            migrated_at = CURRENT_TIMESTAMP`,
        args: [
          leadId,
          key,
          doc.createdByUserId || doc.assignedToUserId || null,
          doc.leadNumber || null,
          json,
          createdAt,
          updatedAt,
        ],
      });

      if (pending.length >= batchSize) {
        await bunny.batch(pending, 'write');
        inserted += pending.length;
        pending = [];
        console.log(`Migrated ${inserted}/${docs.length} leads rows into Bunny SQL`);
      }
    }

    if (pending.length > 0) {
      await bunny.batch(pending, 'write');
      inserted += pending.length;
    }

    console.log(`Migrated ${inserted} leads rows into Bunny SQL`);
  } finally {
    await mongo.close();
    bunny.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
