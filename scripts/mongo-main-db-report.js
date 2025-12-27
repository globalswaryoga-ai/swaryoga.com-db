#!/usr/bin/env node

/**
 * Report all "main" databases and key collection stats.
 * Safe: prints only counts and latest timestamps, no documents.
 *
 * Run:
 *   node scripts/mongo-main-db-report.js
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
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!MAIN_URI) {
  console.error('❌ Missing MongoDB connection string. Set MONGODB_URI_MAIN or MONGODB_URI.');
  process.exit(1);
}

const CANDIDATE_MAIN_DBS = ['swaryogaDB', 'swar_yoga_db', 'swar-yoga-db'];

async function safeCount(db, coll) {
  try {
    return await db.collection(coll).countDocuments({});
  } catch {
    return null;
  }
}

async function latestUpdatedAt(db, coll) {
  try {
    // Many collections use updatedAt/createdAt. We attempt updatedAt then createdAt.
    const doc = await db
      .collection(coll)
      .find({}, { projection: { updatedAt: 1, createdAt: 1 } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(1)
      .next();
    if (!doc) return null;
    return doc.updatedAt || doc.createdAt || null;
  } catch {
    return null;
  }
}

async function listCollections(db) {
  try {
    const cols = await db.listCollections({}, { nameOnly: true }).toArray();
    return cols.map((c) => c.name).sort();
  } catch {
    return null;
  }
}

function fmtDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toISOString();
  } catch {
    return String(d);
  }
}

async function main() {
  await mongoose.connect(MAIN_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  const conn = mongoose.connection;
  const admin = conn.db.admin();

  console.log('✅ Connected to MongoDB (URI hidden)');

  let dbNames = [];
  try {
    const { databases } = await admin.listDatabases();
    dbNames = (databases || []).map((d) => d.name).sort();
  } catch {
    console.log('⚠️  Could not list databases (permissions).');
  }

  if (dbNames.length) {
    console.log(`\n📚 Databases (${dbNames.length}): ${dbNames.join(', ')}`);
  }

  const keyCollections = [
    'users',
    'orders',
    'contacts',
    'signindatas',
    'workshopschedules',
    'workshop_seat_inventories',
    // legacy-ish collections seen in your screenshots
    'dailyplans',
    'goals',
    'tasks',
    'todos',
    'mywords',
  ];

  console.log('\n🏠 Main DB candidates report:');
  for (const dbName of CANDIDATE_MAIN_DBS) {
    const db = conn.useDb(dbName, { useCache: true }).db;
    const cols = await listCollections(db);

    if (!cols || cols.length === 0) {
      console.log(`\n- ${dbName}: (no collections / not accessible / empty)`);
      continue;
    }

    console.log(`\n- ${dbName}: ${cols.length} collections`);

    for (const coll of keyCollections) {
      if (!cols.includes(coll)) continue;
      const c = await safeCount(db, coll);
      const latest = await latestUpdatedAt(db, coll);
      console.log(`    • ${coll}: count=${c ?? 'N/A'}, latest=${fmtDate(latest)}`);
    }
  }

  // CRM DB quick report
  const crmDb = conn.useDb(CRM_DB_NAME, { useCache: true }).db;
  const crmCols = await listCollections(crmDb);
  console.log(`\n🧩 CRM DB: ${CRM_DB_NAME}`);
  if (!crmCols || crmCols.length === 0) {
    console.log('  (no collections / not accessible / empty)');
  } else {
    const crmKey = ['leads', 'whatsapp_messages', 'user_consents', 'audit_logs', 'message_statuses', 'whatsapp_templates'];
    for (const coll of crmKey) {
      if (!crmCols.includes(coll)) continue;
      const c = await safeCount(crmDb, coll);
      const latest = await latestUpdatedAt(crmDb, coll);
      console.log(`    • ${coll}: count=${c ?? 'N/A'}, latest=${fmtDate(latest)}`);
    }
  }

  console.log(`\n✅ Connected DB in URI points to: ${conn.db.databaseName}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('❌ Report failed:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
