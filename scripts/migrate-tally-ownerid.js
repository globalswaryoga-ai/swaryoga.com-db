#!/usr/bin/env node
/**
 * Migration: Backfill ownerId on all Tally collections.
 *
 * Sets ownerId = 'admin' on every document that is missing it,
 * so existing data belongs to the super-admin account.
 *
 * Usage:
 *   MONGODB_URI_MAIN="mongodb+srv://..." node scripts/migrate-tally-ownerid.js
 *
 * Dry-run (count only, no writes):
 *   DRY_RUN=1 MONGODB_URI_MAIN="..." node scripts/migrate-tally-ownerid.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const OWNER_ID = process.env.OWNER_ID || 'admin';
const DRY_RUN = process.env.DRY_RUN === '1';
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

const COLLECTIONS = [
  'acc_groups',
  'acc_ledgers',
  'acc_vouchers',
  'acc_financial_years',
  'acc_voucher_numbering',
  'acc_cost_centers',
  'acc_audit_trail',
  'acc_tds_entries',
  'acc_stock_groups',
  'acc_stock_items',
  'acc_stock_txns',
];

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN is required');
    process.exit(1);
  }

  console.log(`\n🔧 Tally ownerId Migration`);
  console.log(`   Database: ${DB_NAME}`);
  console.log(`   Owner ID: ${OWNER_ID}`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✏️  LIVE (will update documents)'}\n`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  let totalUpdated = 0;

  for (const col of COLLECTIONS) {
    const collection = db.collection(col);

    // Count docs missing ownerId
    const filter = { $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: '' }] };
    const missingCount = await collection.countDocuments(filter);
    const totalCount = await collection.estimatedDocumentCount();

    if (missingCount === 0) {
      console.log(`  ✅ ${col} — ${totalCount} docs, all have ownerId`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  📋 ${col} — ${missingCount}/${totalCount} docs need ownerId`);
    } else {
      const result = await collection.updateMany(filter, { $set: { ownerId: OWNER_ID } });
      console.log(`  ✏️  ${col} — updated ${result.modifiedCount}/${totalCount} docs with ownerId='${OWNER_ID}'`);
      totalUpdated += result.modifiedCount;
    }
  }

  console.log(`\n${DRY_RUN ? '📋 Dry run complete' : `✅ Migration complete — ${totalUpdated} documents updated`}\n`);

  await client.close();
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
