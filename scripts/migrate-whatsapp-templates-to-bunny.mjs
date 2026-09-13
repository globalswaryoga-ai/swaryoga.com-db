#!/usr/bin/env node

/**
 * Preserve MongoDB whatsapp_templates documents in Bunny SQL.
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

function templateKey(doc) {
  const templateName = doc?.templateName || 'unknown-template';
  const provider = doc?.provider || 'unknown-provider';
  const category = doc?.category || 'unknown-category';
  const language = doc?.language || 'unknown-language';
  const metaTemplateId = doc?.metaTemplateId || 'unknown-meta-template';
  return `${String(templateName)}:${String(provider)}:${String(category)}:${String(language)}:${String(metaTemplateId)}`;
}

async function ensureTable(client) {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS whatsapp_templates_sql (
      document_id TEXT PRIMARY KEY,
      template_key TEXT NOT NULL,
      template_name TEXT,
      provider TEXT,
      category TEXT,
      language TEXT,
      status TEXT,
      created_by TEXT,
      meta_template_id TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  });

  await client.execute({ sql: `DROP INDEX IF EXISTS idx_whatsapp_templates_sql_template_key` }).catch(() => {});
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_template_key ON whatsapp_templates_sql (template_key)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_template_name ON whatsapp_templates_sql (template_name)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_provider ON whatsapp_templates_sql (provider)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_category ON whatsapp_templates_sql (category)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_language ON whatsapp_templates_sql (language)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_status ON whatsapp_templates_sql (status)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_created_by ON whatsapp_templates_sql (created_by)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_meta_template_id ON whatsapp_templates_sql (meta_template_id)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_created_at ON whatsapp_templates_sql (created_at)` });
  await client.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sql_updated_at ON whatsapp_templates_sql (updated_at)` });
}

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ url: bunnyUrl, authToken: bunnyToken });

  await mongo.connect();
  try {
    const crmDb = mongo.db(crmDbName);
    const collection = crmDb.collection('whatsapp_templates');

    if (!dryRun) {
      await ensureTable(bunny);
      if (reset) {
        console.log('Resetting whatsapp_templates_sql');
        await bunny.execute('DELETE FROM whatsapp_templates_sql');
      }
    }

    const docs = await collection.find({}).toArray();
    console.log(`Found ${docs.length} whatsapp_templates documents`);

    if (dryRun) {
      console.log('Dry run complete. No SQL rows were changed.');
      return;
    }

    let inserted = 0;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const statements = chunk.map((doc) => ({
        sql: `INSERT INTO whatsapp_templates_sql (
          document_id,
          template_key,
          template_name,
          provider,
          category,
          language,
          status,
          created_by,
          meta_template_id,
          data_json,
          created_at,
          updated_at,
          migrated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(document_id) DO UPDATE SET
          template_key = excluded.template_key,
          template_name = excluded.template_name,
          provider = excluded.provider,
          category = excluded.category,
          language = excluded.language,
          status = excluded.status,
          created_by = excluded.created_by,
          meta_template_id = excluded.meta_template_id,
          data_json = excluded.data_json,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          migrated_at = CURRENT_TIMESTAMP`,
        args: [
          documentId(doc),
          templateKey(doc),
          doc.templateName || null,
          doc.provider || null,
          doc.category || null,
          doc.language || null,
          doc.status || null,
          doc.createdBy || null,
          doc.metaTemplateId || null,
          safeJson(doc),
          dateValue(doc.createdAt || doc.created_at),
          dateValue(doc.updatedAt || doc.updated_at),
        ],
      }));

      await bunny.batch(statements, 'write');
      inserted += chunk.length;
      console.log(`Migrated ${inserted}/${docs.length} whatsapp_templates rows into Bunny SQL`);
    }

    console.log(`Migrated ${inserted} whatsapp_templates rows into Bunny SQL`);
  } finally {
    await mongo.close();
    bunny.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
