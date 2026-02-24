#!/usr/bin/env node
/**
 * Fix: Copy 2024-25 data from tallymanualvouchers to tally_manual_vouchers in CRM DB
 * The schema uses collection: 'tally_manual_vouchers' but migration wrote to 'tallymanualvouchers'
 */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri;
for (const line of env.split('\n')) {
  if (line.startsWith('MONGODB_URI_MAIN=')) {
    uri = line.split('=').slice(1).join('=').trim().replace(/["']/g, '');
  }
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const crmDb = client.db('swaryoga_admin_crm');

  // Source: tallymanualvouchers (wrong name, has 427 docs FY 2024-25)
  const source = crmDb.collection('tallymanualvouchers');
  // Target: tally_manual_vouchers (correct name used by Mongoose schema)
  const target = crmDb.collection('tally_manual_vouchers');

  const sourceCount = await source.countDocuments({ financialYear: '2024-25' });
  console.log(`Source (tallymanualvouchers) FY 2024-25: ${sourceCount} docs`);

  const targetExisting2425 = await target.countDocuments({ financialYear: '2024-25' });
  console.log(`Target (tally_manual_vouchers) FY 2024-25 existing: ${targetExisting2425} docs`);
  
  const targetExisting2324 = await target.countDocuments({ financialYear: '2023-24' });
  console.log(`Target (tally_manual_vouchers) FY 2023-24 existing: ${targetExisting2324} docs`);

  // Remove any existing 2024-25 data in target (avoid duplicates)
  if (targetExisting2425 > 0) {
    await target.deleteMany({ financialYear: '2024-25' });
    console.log(`Cleared ${targetExisting2425} existing 2024-25 docs from target`);
  }

  // Copy 2024-25 docs from source to target
  const docs = await source.find({ financialYear: '2024-25' }).toArray();
  console.log(`\nCopying ${docs.length} FY 2024-25 docs...`);

  // Remove _id to avoid duplicate key errors
  const cleanDocs = docs.map(d => {
    const { _id, ...rest } = d;
    return rest;
  });

  if (cleanDocs.length > 0) {
    const result = await target.insertMany(cleanDocs);
    console.log(`Inserted ${result.insertedCount} documents`);
  }

  // Verify final state
  console.log('\n=== Final State (tally_manual_vouchers) ===');
  const byFY = await target.aggregate([
    { $group: { _id: '$financialYear', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  for (const fy of byFY) {
    console.log(`  FY ${fy._id}: ${fy.count} docs, Rs ${fy.total?.toLocaleString('en-IN')}`);
  }

  const byType = await target.aggregate([
    { $match: { financialYear: '2024-25' } },
    { $group: { _id: '$voucherType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('\n  FY 2024-25 breakdown:');
  for (const t of byType) {
    console.log(`    ${t._id}: ${t.count} entries, Rs ${t.total?.toLocaleString('en-IN')}`);
  }

  await client.close();
  console.log('\nDone! Dashboard should now show live data.');
}

run().catch(e => { console.error(e); process.exit(1); });
