#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

async function main() {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db('swaryoga_admin_crm');

  // Check all FYs
  const fys = await db.collection('tally_manual_balances').distinct('financialYear');
  console.log('Financial Years:', fys);
  for (const fy of fys) {
    const count = await db.collection('tally_manual_balances').countDocuments({ financialYear: fy });
    console.log(`  FY ${fy}: ${count} entries`);
  }

  // Check for duplicates
  const all = await db.collection('tally_manual_balances').find({}).toArray();
  const byKey = {};
  for (const e of all) {
    const key = e.financialYear + '|' + e.ledgerName;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(e);
  }

  console.log('\nDuplicates:');
  let found = false;
  for (const [key, entries] of Object.entries(byKey)) {
    if (entries.length > 1) {
      found = true;
      console.log(`  ${key} -> ${entries.length} entries:`);
      entries.forEach(e => console.log(`    id=${e._id} amt=${e.amount} drCr=${e.drCr} by=${e.createdBy}`));
    }
  }
  if (!found) console.log('  None found');

  // Check entries from screenshot
  const suspicious = ['MOHAN PANDURANG KALBURGI', 'UPAMNYU MOHAN KALBURGI', 'AUDIT FEES PAYABLE',
    'Profit & Loss A/c', 'MAHI SANTANI', 'MOHAN KALBURGI'];
  const found2 = await db.collection('tally_manual_balances').find({
    ledgerName: { $in: suspicious }
  }).toArray();
  console.log('\nScreenshot entries (extra ones):');
  if (found2.length === 0) console.log('  None found in DB - they may be from FY 2023-24');
  found2.forEach(e => console.log(`  FY=${e.financialYear} | id=${e._id} | ${e.ledgerName} | ${e.parentGroup} | amt=${e.amount} ${e.drCr} | by=${e.createdBy}`));

  // Check FY 2023-24 entries
  const fy2324 = await db.collection('tally_manual_balances').find({ financialYear: '2023-24' }).sort({ category: 1, ledgerName: 1 }).toArray();
  console.log('\n=== FY 2023-24 Entries ===');
  console.log(`Total: ${fy2324.length}`);
  fy2324.forEach(e => console.log(`  ${e.category} | ${e.ledgerName} | ${e.parentGroup} | amt=${e.amount} ${e.drCr} | by=${e.createdBy}`));

  await c.close();
}

main().catch(e => { console.error(e); process.exit(1); });
