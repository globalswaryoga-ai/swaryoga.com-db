#!/usr/bin/env node
/**
 * Emergency diagnostic — check ALL tally data across both databases
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

  console.log('========== FULL DATA DIAGNOSTIC ==========\n');

  for (const dbName of ['swaryogaDB', 'swaryoga_admin_crm']) {
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const tallyColls = collections.filter(c => c.name.toLowerCase().includes('tally') || c.name.toLowerCase().includes('voucher'));
    
    console.log(`\n--- ${dbName} ---`);
    console.log(`Tally-related collections: ${tallyColls.map(c => c.name).join(', ') || 'NONE'}`);

    for (const coll of tallyColls) {
      const col = db.collection(coll.name);
      const total = await col.countDocuments({});
      console.log(`\n  ${coll.name}: ${total} total docs`);
      
      // Count by FY
      const byFY = await col.aggregate([
        { $group: { _id: '$financialYear', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      for (const fy of byFY) {
        console.log(`    FY ${fy._id}: ${fy.count} docs, Rs ${fy.total?.toLocaleString('en-IN') || 0}`);
      }

      // Count by voucherType for 2024-25
      const byType = await col.aggregate([
        { $match: { financialYear: '2024-25' } },
        { $group: { _id: '$voucherType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      if (byType.length > 0) {
        console.log(`    FY 2024-25 breakdown:`);
        for (const t of byType) {
          console.log(`      ${t._id}: ${t.count} entries, Rs ${t.total?.toLocaleString('en-IN')}`);
        }
      }

      // Sample first 3 docs
      const samples = await col.find({}).limit(3).toArray();
      if (samples.length > 0) {
        console.log(`    Sample doc keys: ${Object.keys(samples[0]).join(', ')}`);
        console.log(`    Sample: FY=${samples[0].financialYear}, type=${samples[0].voucherType}, amount=${samples[0].amount}, party=${samples[0].partyName}`);
      }
    }
  }

  await client.close();
  console.log('\n========== DONE ==========');
}

run().catch(e => { console.error(e); process.exit(1); });
