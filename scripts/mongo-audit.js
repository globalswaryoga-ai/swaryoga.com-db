#!/usr/bin/env node

/**
 * MongoDB Audit (safe output)
 *
 * Goals:
 * - Connect using MONGODB_URI_MAIN || MONGODB_URI
 * - List databases (names only)
 * - Verify expected DB split:
 *    - Main app DB contains users/orders/etc
 *    - CRM DB (MONGODB_CRM_DB_NAME) contains leads/whatsapp/etc
 * - Print counts and index status WITHOUT dumping sensitive documents.
 *
 * Run:
 *   node scripts/mongo-audit.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load env from .env first (repo-local), then .env.local if present.
// We deliberately avoid printing env values.
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch {}
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
} catch {}

const MAIN_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!MAIN_URI) {
  console.error('❌ Missing MongoDB connection string. Set MONGODB_URI_MAIN or MONGODB_URI in .env/.env.local');
  process.exit(1);
}

function plural(n, one, many = one + 's') {
  return n === 1 ? one : many;
}

async function safeCount(db, name) {
  try {
    return await db.collection(name).countDocuments({});
  } catch {
    return null;
  }
}

async function hasIndex(db, collName, predicate) {
  try {
    const idx = await db.collection(collName).indexes();
    return idx.some(predicate);
  } catch {
    return null;
  }
}

async function main() {
  const startedAt = Date.now();

  // Connect
  await mongoose.connect(MAIN_URI, {
    dbName: MAIN_DB_NAME,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  const conn = mongoose.connection;
  const admin = conn.db.admin();

  console.log('✅ Connected to MongoDB (URI hidden)');
  console.log(`🏠 Main DB enforced as: ${MAIN_DB_NAME}`);
  console.log(`ℹ️  CRM DB name configured as: ${CRM_DB_NAME}`);

  // List databases
  let dbNames = [];
  try {
    const { databases } = await admin.listDatabases();
    dbNames = (databases || []).map((d) => d.name).sort();
  } catch (e) {
    console.log('⚠️  Could not list databases (insufficient permissions). Skipping DB list.');
  }

  if (dbNames.length) {
    console.log(`\n📚 Databases (${dbNames.length}):`);
    for (const n of dbNames) console.log(`  - ${n}`);
  }

  // Main DB heuristic: the DB selected by connection options (dbName) is conn.db.databaseName
  const mainDbName = conn.db.databaseName;
  const mainDb = conn.db;
  const crmDb = conn.useDb(CRM_DB_NAME, { useCache: true }).db;

  console.log(`\n🏠 Main DB (from connection): ${mainDbName}`);

  // Check key collections (counts only)
  const mainCollectionsToCheck = ['users', 'orders', 'contacts', 'workshopschedules', 'workshop_seat_inventories'];
  const crmCollectionsToCheck = ['leads', 'whatsapp_messages', 'user_consents', 'audit_logs', 'message_statuses', 'whatsapp_templates'];

  console.log('\n🔎 Main DB collection counts:');
  for (const c of mainCollectionsToCheck) {
    const n = await safeCount(mainDb, c);
    if (n === null) console.log(`  - ${c}: (not found / no access)`);
    else console.log(`  - ${c}: ${n}`);
  }

  console.log('\n🔎 CRM DB collection counts:');
  for (const c of crmCollectionsToCheck) {
    const n = await safeCount(crmDb, c);
    if (n === null) console.log(`  - ${c}: (not found / no access)`);
    else console.log(`  - ${c}: ${n}`);
  }

  // Index checks for “permanent + correct” behavior
  console.log('\n🧱 Index checks (important for stable saves):');

  // Main users email uniqueness
  const usersEmailUnique = await hasIndex(mainDb, 'users', (i) => i.key && i.key.email === 1 && i.unique);
  if (usersEmailUnique === null) console.log('  - users.email unique index: (cannot check)');
  else console.log(`  - users.email unique index: ${usersEmailUnique ? '✅ present' : '⚠️ missing'}`);

  // CRM leads phoneNumber uniqueness
  const leadsPhoneUnique = await hasIndex(crmDb, 'leads', (i) => i.key && i.key.phoneNumber === 1 && i.unique);
  if (leadsPhoneUnique === null) console.log('  - leads.phoneNumber unique index: (cannot check)');
  else console.log(`  - leads.phoneNumber unique index: ${leadsPhoneUnique ? '✅ present' : '⚠️ missing'}`);

  // Summaries / warnings
  console.log('\n✅ Summary:');
  console.log(`  - Main DB appears to be: ${mainDbName}`);
  console.log(`  - CRM DB appears to be: ${CRM_DB_NAME}`);

  if (dbNames.length) {
    const similarMainDbs = dbNames.filter((n) => {
      const s = n.toLowerCase();
      return s.includes('swar') && ![CRM_DB_NAME.toLowerCase(), 'admin', 'local', 'sample_mflix'].includes(s);
    });

    if (similarMainDbs.length > 1) {
      console.log(`\n⚠️  You have multiple "main"-looking DB names (${similarMainDbs.length}): ${similarMainDbs.join(', ')}`);
      console.log('   This usually means older connection strings used different DB names after the `/` in the Mongo URI.');
      console.log('   Recommended: pick ONE main DB name (e.g. swar_yoga_db) and ensure your Vercel/local MONGODB_URI_MAIN includes that DB name.');
    }
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(`\n⏱️  Audit complete in ${elapsedMs} ms`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('❌ Audit failed:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
