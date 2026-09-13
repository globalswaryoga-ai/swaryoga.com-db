#!/usr/bin/env node

/**
 * Preserve MongoDB crm_receipts documents in Bunny SQL.
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

function receiptKey(doc) {
  const leadId = doc?.leadId || 'unknown-lead';
  const receiptNumber = doc?.receiptNumber || 'unknown-receipt';
  const leadNumber = doc?.leadNumber || 'unknown-lead-number';
  const issuedAt = doc?.issuedAt || doc?.createdAt || 'unknown-issued-at';
  return `${String(leadId)}:${String(receiptNumber)}:${String(leadNumber)}:${String(issuedAt)}`;
}

async function ensureTable(client) {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS crm_receipts_sql (
      document_id TEXT PRIMARY KEY,
      receipt_key TEXT NOT NULL,
      lead_id TEXT,
      lead_number TEXT,
      receipt_number TEXT,
      issued_by_user_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      workshop_name TEXT,
      status TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  });

  await client.execute({ sql: `DROP INDEX IF EXISTS idx_crm_receipts_sql_receipt_key` }).catch(() => {});
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_receipt_key ON crm_receipts_sql (receipt_key)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_lead_id ON crm_receipts_sql (lead_id)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_lead_number ON crm_receipts_sql (lead_number)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_receipt_number ON crm_receipts_sql (receipt_number)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_issued_by_user_id ON crm_receipts_sql (issued_by_user_id)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_customer_phone ON crm_receipts_sql (customer_phone)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_customer_email ON crm_receipts_sql (customer_email)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_workshop_name ON crm_receipts_sql (workshop_name)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_created_at ON crm_receipts_sql (created_at)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sql_updated_at ON crm_receipts_sql (updated_at)` });
}

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: bunnyUrl, authToken: bunnyToken });

  await mongo.connect();
  try {
    const crmDb = mongo.db(crmDbName);
    const collection = crmDb.collection('crm_receipts');

    if (!dryRun) {
      await ensureTable(bunny);
      if (reset) {
        console.log('Resetting crm_receipts_sql');
        await bunny.execute('DELETE FROM crm_receipts_sql');
      }
    }

    const docs = await collection.find({}).toArray();
    console.log(`Found ${docs.length} crm_receipts documents`);

    if (dryRun) {
      console.log('Dry run complete. No SQL rows were changed.');
      return;
    }

    let inserted = 0;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const statements = chunk.map((doc) => ({
        sql: `INSERT INTO crm_receipts_sql (
          document_id,
          receipt_key,
          lead_id,
          lead_number,
          receipt_number,
          issued_by_user_id,
          customer_name,
          customer_phone,
          customer_email,
          workshop_name,
          status,
          data_json,
          created_at,
          updated_at,
          migrated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(document_id) DO UPDATE SET
          receipt_key = excluded.receipt_key,
          lead_id = excluded.lead_id,
          lead_number = excluded.lead_number,
          receipt_number = excluded.receipt_number,
          issued_by_user_id = excluded.issued_by_user_id,
          customer_name = excluded.customer_name,
          customer_phone = excluded.customer_phone,
          customer_email = excluded.customer_email,
          workshop_name = excluded.workshop_name,
          status = excluded.status,
          data_json = excluded.data_json,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          migrated_at = CURRENT_TIMESTAMP`,
        args: [
          documentId(doc),
          receiptKey(doc),
          doc.leadId ? String(doc.leadId) : null,
          doc.leadNumber || null,
          doc.receiptNumber || null,
          doc.issuedByUserId || null,
          doc.customerName || null,
          doc.customerPhone || null,
          doc.customerEmail || null,
          doc.workshopName || null,
          doc.payment?.status || doc.status || null,
          safeJson(doc),
          dateValue(doc.createdAt || doc.created_at),
          dateValue(doc.updatedAt || doc.updated_at),
        ],
      }));

      await bunny.batch(statements, 'write');
      inserted += chunk.length;
      console.log(`Migrated ${inserted}/${docs.length} crm_receipts rows into Bunny SQL`);
    }

    console.log(`Migrated ${inserted} crm_receipts rows into Bunny SQL`);
  } finally {
    await mongo.close();
    bunny.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
