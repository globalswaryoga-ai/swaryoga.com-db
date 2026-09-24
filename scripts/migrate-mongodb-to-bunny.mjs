#!/usr/bin/env node

/**
 * Preserve MongoDB documents in Bunny Database.
 *
 * This is a data-preservation migration, not yet an application-API rewrite.
 * Complex MongoDB values are stored as Extended JSON in document_json so no
 * arrays, nested objects, ObjectIds, or dates are silently discarded.
 *
 * Usage:
 *   node scripts/migrate-mongodb-to-bunny.mjs --dry-run
 *   node scripts/migrate-mongodb-to-bunny.mjs --apply
 *   node scripts/migrate-mongodb-to-bunny.mjs --apply --include-sensitive
 *   node scripts/migrate-mongodb-to-bunny.mjs --apply --reset
 */

import dotenv from 'dotenv';
import mongodb from 'mongodb';
import { createClient } from '@libsql/client';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { MongoClient } = mongodb;
const { EJSON } = mongodb.BSON;

const MAIN_DB = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
const CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const bunnyUrl = process.env.BUNNY_DATABASE_URL;
const bunnyToken = process.env.BUNNY_DATABASE_AUTH_TOKEN;
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const dryRun = args.has('--dry-run') || !apply;
const includeSensitive = args.has('--include-sensitive');
const reset = args.has('--reset');
const batchSize = Number(process.env.BUNNY_MIGRATION_BATCH_SIZE || 50);

if (!mongoUri) throw new Error('MONGODB_URI_MAIN or MONGODB_URI is missing');
if (!bunnyUrl || !bunnyToken) {
  throw new Error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required');
}
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
  throw new Error('BUNNY_MIGRATION_BATCH_SIZE must be an integer between 1 and 100');
}

const excludedCollections = new Set([
  'baileys_auth_state',
]);

const schemaSql = [
  `CREATE TABLE IF NOT EXISTS mongo_documents (
    source_database TEXT NOT NULL,
    collection_name TEXT NOT NULL,
    document_id TEXT NOT NULL,
    document_json TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (source_database, collection_name, document_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mongo_documents_collection
    ON mongo_documents (source_database, collection_name)`,
  `CREATE INDEX IF NOT EXISTS idx_mongo_documents_created
    ON mongo_documents (created_at)`,
  `CREATE TABLE IF NOT EXISTS mongo_migration_runs (
    run_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    mode TEXT NOT NULL,
    include_sensitive INTEGER NOT NULL,
    documents_seen INTEGER NOT NULL DEFAULT 0,
    documents_written INTEGER NOT NULL DEFAULT 0,
    bytes_written INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    error TEXT
  )`,
];

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

function sqlArg(value) {
  return value === undefined ? null : value;
}

async function ensureSchema(client) {
  for (const sql of schemaSql) await client.execute(sql);
}

async function getCollections(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  return collections
    .map(({ name }) => name)
    .filter(name => !name.startsWith('system.'))
    .filter(name => includeSensitive || !excludedCollections.has(name))
    .sort();
}

async function main() {
  const runId = `mongo-${Date.now()}`;
  const mode = dryRun ? 'dry-run' : 'apply';
  const bunny = createClient({ url: bunnyUrl, authToken: bunnyToken });
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 15000 });
  let seen = 0;
  let written = 0;
  let bytes = 0;

  console.log(`Mode: ${mode}`);
  console.log(`Sensitive auth state: ${includeSensitive ? 'included' : 'excluded'}`);
  console.log(`Batch size: ${batchSize}`);

  await mongo.connect();
  try {
    if (!dryRun) {
      await ensureSchema(bunny);
      await bunny.execute({
        sql: `INSERT INTO mongo_migration_runs
          (run_id, started_at, mode, include_sensitive, status)
          VALUES (?, ?, ?, ?, ?)`,
        args: [runId, new Date().toISOString(), mode, includeSensitive ? 1 : 0, 'running'],
      });
      if (reset) {
        console.warn('Resetting mongo_documents before import.');
        await bunny.execute('DELETE FROM mongo_documents');
      }
    }

    for (const databaseName of [MAIN_DB, CRM_DB]) {
      const db = mongo.db(databaseName);
      const collections = await getCollections(db);
      console.log(`\nDatabase ${databaseName}: ${collections.length} collections`);

      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const cursor = collection.find({}, { batchSize });
        let collectionSeen = 0;
        let statements = [];

        for await (const document of cursor) {
          const json = safeJson(document);
          const id = documentId(document);
          const createdAt = dateValue(document.createdAt);
          const updatedAt = dateValue(document.updatedAt);
          seen += 1;
          collectionSeen += 1;
          bytes += Buffer.byteLength(json, 'utf8');

          if (!dryRun) {
            statements.push({
              sql: `INSERT INTO mongo_documents
                (source_database, collection_name, document_id, document_json, created_at, updated_at, migrated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(source_database, collection_name, document_id) DO UPDATE SET
                  document_json = excluded.document_json,
                  created_at = excluded.created_at,
                  updated_at = excluded.updated_at,
                  migrated_at = CURRENT_TIMESTAMP`,
              args: [databaseName, collectionName, id, json, sqlArg(createdAt), sqlArg(updatedAt)],
            });
          }

          if (!dryRun && statements.length >= batchSize) {
            await bunny.batch(statements, 'write');
            written += statements.length;
            statements = [];
            if (written % 1000 === 0) console.log(`  ${collectionName}: ${written} documents written overall`);
          }
        }

        if (!dryRun && statements.length) {
          await bunny.batch(statements, 'write');
          written += statements.length;
        }
        console.log(`  ${collectionName}: ${collectionSeen} documents`);
      }
    }

    if (!dryRun) {
      await bunny.execute({
        sql: `UPDATE mongo_migration_runs SET completed_at = ?, documents_seen = ?, documents_written = ?, bytes_written = ?, status = ? WHERE run_id = ?`,
        args: [new Date().toISOString(), seen, written, bytes, 'completed', runId],
      });
    }

    console.log(`\nDocuments seen: ${seen}`);
    console.log(`Documents written: ${written}`);
    console.log(`JSON bytes: ${bytes}`);
    console.log(dryRun ? 'Dry run complete. No Bunny data was changed.' : 'Migration complete.');
  } catch (error) {
    if (!dryRun) {
      await bunny.execute({
        sql: `UPDATE mongo_migration_runs SET completed_at = ?, documents_seen = ?, documents_written = ?, bytes_written = ?, status = ?, error = ? WHERE run_id = ?`,
        args: [new Date().toISOString(), seen, written, bytes, 'failed', error instanceof Error ? error.message : String(error), runId],
      }).catch(() => {});
    }
    throw error;
  } finally {
    await mongo.close();
    bunny.close();
  }
}

main().catch(error => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
