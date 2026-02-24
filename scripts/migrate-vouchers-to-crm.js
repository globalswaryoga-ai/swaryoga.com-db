#!/usr/bin/env node
/**
 * Migrate tally_manual_vouchers from swaryogaDB to swaryoga_admin_crm
 * The import script wrote to the main DB, but the app reads from the CRM DB.
 */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read MONGODB_URI_MAIN from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri;
for (const line of env.split('\n')) {
  if (line.startsWith('MONGODB_URI_MAIN=')) {
    uri = line.split('=').slice(1).join('=').trim().replace(/["']/g, '');
  }
}
if (!uri) { console.error('No MONGODB_URI_MAIN found'); process.exit(1); }

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to MongoDB');

  const mainDb = client.db('swaryogaDB');
  const crmDb = client.db('swaryoga_admin_crm');

  // Check both DBs - the Mongoose model uses collection name "tallymanualvouchers" (lowercase, no underscores)
  const mainUnder = await mainDb.collection('tally_manual_vouchers').countDocuments({});
  const mainNoUnder = await mainDb.collection('tallymanualvouchers').countDocuments({});
  const crmUnder = await crmDb.collection('tally_manual_vouchers').countDocuments({});
  const crmNoUnder = await crmDb.collection('tallymanualvouchers').countDocuments({});

  console.log('\n=== Document counts ===');
  console.log('swaryogaDB.tally_manual_vouchers:', mainUnder);
  console.log('swaryogaDB.tallymanualvouchers:', mainNoUnder);
  console.log('swaryoga_admin_crm.tally_manual_vouchers:', crmUnder);
  console.log('swaryoga_admin_crm.tallymanualvouchers:', crmNoUnder);

  // Find where the data is
  let sourceDb, sourceCollection;
  if (mainUnder > 0) { sourceDb = mainDb; sourceCollection = 'tally_manual_vouchers'; }
  else if (mainNoUnder > 0) { sourceDb = mainDb; sourceCollection = 'tallymanualvouchers'; }
  else if (crmUnder > 0) { sourceDb = crmDb; sourceCollection = 'tally_manual_vouchers'; }
  else if (crmNoUnder > 0) { console.log('\nData already in correct location!'); await client.close(); return; }
  else { console.log('\nNo data found anywhere!'); await client.close(); return; }

  console.log(`\nSource: ${sourceDb.databaseName}.${sourceCollection}`);

  // Mongoose creates collection as "tallymanualvouchers" in crmDb
  const targetCollection = 'tallymanualvouchers';
  console.log(`Target: swaryoga_admin_crm.${targetCollection}`);

  // Read all docs from source
  const docs = await sourceDb.collection(sourceCollection).find({}).toArray();
  console.log(`Found ${docs.length} documents to migrate`);

  if (docs.length === 0) {
    await client.close();
    return;
  }

  // Remove _id to let MongoDB generate new ones (or keep them)
  // Actually keep _id to avoid duplicates if run again
  
  // Clear target first
  const existingTarget = await crmDb.collection(targetCollection).countDocuments({});
  if (existingTarget > 0) {
    console.log(`Clearing ${existingTarget} existing docs in target...`);
    await crmDb.collection(targetCollection).deleteMany({});
  }

  // Insert into CRM DB
  const result = await crmDb.collection(targetCollection).insertMany(docs);
  console.log(`Inserted ${result.insertedCount} documents into swaryoga_admin_crm.${targetCollection}`);

  // Verify
  const finalCount = await crmDb.collection(targetCollection).countDocuments({});
  console.log(`\nVerification: swaryoga_admin_crm.${targetCollection} now has ${finalCount} documents`);

  // Show breakdown by voucherType
  const types = await crmDb.collection(targetCollection).aggregate([
    { $group: { _id: '$voucherType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('\nBreakdown:');
  for (const t of types) {
    console.log(`  ${t._id}: ${t.count} entries, total Rs ${t.total.toLocaleString('en-IN')}`);
  }

  await client.close();
  console.log('\nDone!');
}

run().catch(e => { console.error(e); process.exit(1); });
