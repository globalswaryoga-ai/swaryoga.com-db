#!/usr/bin/env node
/**
 * Test: Simulate exactly what the Tally dashboard API does
 * to find why it returns zeros
 */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri, crmDbName;
for (const line of env.split('\n')) {
  if (line.startsWith('MONGODB_URI_MAIN=')) {
    uri = line.split('=').slice(1).join('=').trim().replace(/["']/g, '');
  }
  if (line.startsWith('MONGODB_CRM_DB_NAME=')) {
    crmDbName = line.split('=').slice(1).join('=').trim().replace(/["']/g, '');
  }
}

console.log('MONGODB_URI_MAIN:', uri ? uri.substring(0, 40) + '...' : 'NOT SET');
console.log('MONGODB_CRM_DB_NAME:', crmDbName || 'NOT SET (default: swaryoga_admin_crm)');

const actualCrmDb = crmDbName || 'swaryoga_admin_crm';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();

  // Parse default DB from URI
  const { URL } = require('url');
  const parsed = new URL(uri);
  const defaultDb = parsed.pathname.replace('/', '').split('?')[0];
  console.log('Default DB from URI:', defaultDb);
  console.log('CRM DB being used:', actualCrmDb);
  console.log();

  // Mongoose connectDB() connects to default DB from URI
  // Then useDb(CRM_DB_NAME) switches to the CRM DB
  // The getTallyManualVoucher model uses collection: 'tally_manual_vouchers'
  
  const crmDb = client.db(actualCrmDb);
  
  // This is what the API does:
  const fy = '2024-25';
  console.log('=== Simulating API dashboard query ===');
  console.log(`Collection: ${actualCrmDb}.tally_manual_vouchers`);
  console.log(`Filter: { financialYear: "${fy}" }`);
  console.log();

  const col = crmDb.collection('tally_manual_vouchers');
  
  // Exact same aggregation as route.ts
  const pipeline = [
    { $match: { financialYear: fy } },
    { $group: { _id: '$voucherType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ];
  const stats = await col.aggregate(pipeline).exec ? col.aggregate(pipeline) : col.aggregate(pipeline);
  const results = await stats.toArray();
  
  console.log('Aggregation results:');
  const manualStats = {};
  for (const s of results) {
    manualStats[s._id] = { count: s.count, total: s.total };
    console.log(`  ${s._id}: ${s.count} entries, ₹${s.total.toLocaleString('en-IN')}`);
  }

  if (results.length === 0) {
    console.log('  *** NO DATA FOUND ***');
    
    // Debug: check what's actually in the collection
    const totalDocs = await col.countDocuments({});
    console.log(`\n  Total docs in collection: ${totalDocs}`);
    
    const allFYs = await col.distinct('financialYear');
    console.log(`  Financial years in collection: ${allFYs.join(', ')}`);
    
    const sample = await col.findOne({});
    if (sample) {
      console.log(`  Sample doc:`, JSON.stringify(sample, null, 2).substring(0, 500));
    }
  }

  // Recent receipts query (same as API)
  const recentReceipts = await col.find(
    { financialYear: fy, voucherType: 'Receipt' }
  ).sort({ date: -1 }).limit(12).toArray();
  console.log(`\nRecent receipts: ${recentReceipts.length}`);
  for (const r of recentReceipts.slice(0, 3)) {
    console.log(`  ${r.date} ${r.partyName} ₹${r.amount}`);
  }

  // Recent payments query (same as API)
  const recentPayments = await col.find(
    { financialYear: fy, voucherType: 'Payment' }
  ).sort({ date: -1 }).limit(10).toArray();
  console.log(`\nRecent payments: ${recentPayments.length}`);
  for (const p of recentPayments.slice(0, 3)) {
    console.log(`  ${p.date} ${p.partyName} ₹${p.amount}`);
  }

  // Participants
  const mainDb = client.db(defaultDb || 'swaryogaDB');
  const userCount = await mainDb.collection('users').countDocuments({ isAdmin: { $ne: true } });
  console.log(`\nParticipants: ${userCount}`);

  // Build the summary the API would return
  const totalReceipts = manualStats.Receipt?.total || 0;
  const totalPayments = manualStats.Payment?.total || 0;
  const profitLoss = totalReceipts - totalPayments;
  
  console.log('\n=== API Response Summary ===');
  console.log(`totalReceipts: ₹${totalReceipts.toLocaleString('en-IN')}`);
  console.log(`totalPayments: ₹${totalPayments.toLocaleString('en-IN')}`);
  console.log(`profitLoss: ₹${profitLoss.toLocaleString('en-IN')}`);
  console.log(`participantCount: ${userCount}`);

  await client.close();
}

run().catch(e => { console.error(e); process.exit(1); });
