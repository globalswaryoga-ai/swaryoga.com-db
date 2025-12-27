#!/usr/bin/env node

/**
 * DANGER: Drop legacy databases from the cluster.
 *
 * This is intentionally hard to run. It requires:
 * - A working MONGODB_URI(_MAIN)
 * - CONFIRM_DROP_LEGACY_DBS="DROP_LEGACY_DBS_NOW"
 *
 * Usage:
 *   CONFIRM_DROP_LEGACY_DBS=DROP_LEGACY_DBS_NOW node scripts/mongo-drop-legacy-dbs.js
 *
 * Notes:
 * - This will permanently delete the specified databases and all collections.
 * - Take an Atlas backup/snapshot or export before running.
 */

const mongoose = require('mongoose');
const path = require('path');

try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch {}
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
} catch {}

const MAIN_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
if (!MAIN_URI) {
  console.error('❌ Missing MongoDB connection string. Set MONGODB_URI_MAIN or MONGODB_URI.');
  process.exit(1);
}

const CONFIRM = process.env.CONFIRM_DROP_LEGACY_DBS;
if (CONFIRM !== 'DROP_LEGACY_DBS_NOW') {
  console.error('❌ Refusing to run. This script deletes databases.');
  console.error('   To run: CONFIRM_DROP_LEGACY_DBS=DROP_LEGACY_DBS_NOW node scripts/mongo-drop-legacy-dbs.js');
  process.exit(1);
}

// Databases to drop. Keep CRM + current main DB.
const LEGACY_DBS = ['swar-yoga-db', 'swar_yoga_db'];

async function main() {
  await mongoose.connect(MAIN_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  const conn = mongoose.connection;
  const admin = conn.db.admin();

  const { databases } = await admin.listDatabases();
  const dbNames = (databases || []).map((d) => d.name);

  console.log('✅ Connected. Preparing to drop legacy DBs:', LEGACY_DBS.join(', '));

  for (const dbName of LEGACY_DBS) {
    if (!dbNames.includes(dbName)) {
      console.log(`ℹ️  ${dbName}: not found, skipping`);
      continue;
    }

    console.log(`🗑️  Dropping database: ${dbName}`);
    const db = conn.useDb(dbName, { useCache: false }).db;
    await db.dropDatabase();
    console.log(`✅ Dropped: ${dbName}`);
  }

  await mongoose.disconnect();
  console.log('✅ Done.');
}

main().catch(async (err) => {
  console.error('❌ Failed:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
