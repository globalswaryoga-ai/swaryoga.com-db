#!/usr/bin/env node
/**
 * One-time migration: switch `leads.leadNumber` from a GLOBAL unique index to a
 * PER-TENANT compound unique index, enabling per-tenant lead numbering (SaaS).
 *
 *   old: { leadNumber: 1 } unique sparse                 (global)
 *   new: { createdByUserId: 1, leadNumber: 1 } unique    (per tenant)
 *        partialFilterExpression: { leadNumber: { $type: 'string' } }
 *
 * Idempotent and safe to re-run. Run with prod env:
 *   MONGODB_URI_MAIN=... MONGODB_CRM_DB_NAME=swaryoga_admin_crm node scripts/migrate-lead-number-index.mjs
 */
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const OLD_INDEX = 'leadNumber_1';
const NEW_INDEX_KEY = { createdByUserId: 1, leadNumber: 1 };

if (!URI) {
  console.error('Missing MONGODB_URI_MAIN');
  process.exit(1);
}

const main = async () => {
  await mongoose.connect(URI, { dbName: DB });
  const col = mongoose.connection.db.collection('leads');

  const before = await col.indexes();
  console.log(`[${DB}.leads] indexes BEFORE:`);
  before.forEach((i) => console.log('  -', i.name, JSON.stringify(i.key), i.unique ? '(unique)' : '', i.partialFilterExpression ? 'partial' : ''));

  // 1) Drop the old global unique index if it exists.
  if (before.some((i) => i.name === OLD_INDEX)) {
    await col.dropIndex(OLD_INDEX);
    console.log(`\nDropped old global index ${OLD_INDEX}`);
  } else {
    console.log(`\nOld global index ${OLD_INDEX} not present (already migrated?)`);
  }

  // 2) Create the per-tenant compound unique index (partial → only docs with a leadNumber).
  const newName = await col.createIndex(NEW_INDEX_KEY, {
    unique: true,
    partialFilterExpression: { leadNumber: { $type: 'string' } },
    name: 'createdByUserId_1_leadNumber_1',
  });
  console.log(`Created per-tenant unique index: ${newName}`);

  const after = await col.indexes();
  console.log(`\n[${DB}.leads] indexes AFTER:`);
  after.forEach((i) => console.log('  -', i.name, JSON.stringify(i.key), i.unique ? '(unique)' : '', i.partialFilterExpression ? 'partial' : ''));

  await mongoose.disconnect();
  console.log('\nDone.');
};

main().catch((e) => {
  console.error('Migration failed:', e?.message || e);
  process.exit(1);
});
