#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  const allLedgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();

  // Fixed Assets (net block)
  const fixedAsset = allLedgers.filter(l => l.subGroup === 'Fixed Assets' || l.name === 'Fixed Assets (Net Block)');
  
  // Depreciation ledgers
  const depLedgers = allLedgers.filter(l => l.name.match(/^Depreciation/i));

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  FIXED ASSET SCHEDULE — FY 2023-24');
  console.log('  Upamnyu International Education Pvt. Ltd.');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('FIXED ASSETS (Balance Sheet):');
  for (const l of fixedAsset) {
    console.log(`  ${l.name.padEnd(40)} ₹${(l.openingBalance || 0).toLocaleString('en-IN').padStart(12)} ${l.openingBalanceType}`);
  }

  console.log('\nDEPRECIATION (P&L):');
  let totalDep = 0;
  for (const l of depLedgers) {
    const amt = l.openingBalance || 0;
    totalDep += amt;
    console.log(`  ${l.name.padEnd(40)} ₹${amt.toLocaleString('en-IN').padStart(12)} ${l.openingBalanceType}`);
  }
  console.log(`  ${'Total Depreciation'.padEnd(40)} ₹${totalDep.toLocaleString('en-IN').padStart(12)}`);

  // All assets
  console.log('\nALL ASSET LEDGERS:');
  const assets = allLedgers.filter(l => l.group === 'ASSET');
  for (const l of assets) {
    console.log(`  ${l.name.padEnd(40)} ₹${(l.openingBalance || 0).toLocaleString('en-IN').padStart(12)} ${l.openingBalanceType} | subGroup: ${l.subGroup || '-'}`);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('NOTE: FY 2023-24 has only a single "Fixed Assets (Net Block)"');
  console.log('ledger (₹3,97,719). The CA report shows this as the net value');
  console.log('after depreciation. Individual asset items (Computer, Furniture,');
  console.log('Software, etc.) are tracked only via their depreciation ledgers.');
  console.log('════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
