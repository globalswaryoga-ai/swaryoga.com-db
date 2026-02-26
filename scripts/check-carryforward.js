/**
 * Check if all FY 2023-24 closing balances are carried forward to FY 2024-25
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');

  const fy2324 = await b.find({ financialYear: '2023-24' }).sort({ category: 1, ledgerName: 1 }).toArray();
  const fy2425 = await b.find({ financialYear: '2024-25' }).sort({ category: 1, ledgerName: 1 }).toArray();

  // Build lookup for 24-25
  const map2425 = {};
  for (const x of fy2425) {
    map2425[x.ledgerName] = x;
  }

  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  CARRY-FORWARD CHECK: FY 2023-24 → FY 2024-25');
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('');

  let missing = [];
  let mismatched = [];
  let ok = [];
  let lastCat = '';

  // Only check asset & liability (balance sheet items carry forward)
  // Income & expense don't carry forward (they reset each year)
  const bsEntries = fy2324.filter(x => x.category === 'asset' || x.category === 'liability');

  for (const entry of bsEntries) {
    if (entry.category !== lastCat) {
      console.log('── ' + entry.category.toUpperCase() + ' ──');
      lastCat = entry.category;
    }

    const match = map2425[entry.ledgerName];
    const amt2324 = entry.amount;
    const drCr2324 = entry.drCr;

    if (!match) {
      console.log('  ❌ MISSING  | ' + entry.ledgerName.padEnd(35) + ' | 23-24: Rs.' + amt2324.toLocaleString('en-IN').padStart(12) + ' ' + drCr2324 + ' | 24-25: NOT FOUND');
      missing.push(entry);
    } else {
      // For carry-forward, the 24-25 amount should be >= 23-24 amount (since it includes new activity)
      // We just check if the ledger EXISTS in 24-25
      console.log('  ✅ EXISTS   | ' + entry.ledgerName.padEnd(35) + ' | 23-24: Rs.' + amt2324.toLocaleString('en-IN').padStart(12) + ' ' + drCr2324 + ' | 24-25: Rs.' + match.amount.toLocaleString('en-IN').padStart(12) + ' ' + match.drCr);
      ok.push({ name: entry.ledgerName, amt2324, amt2425: match.amount });
    }
  }

  // Check for new entries in 24-25 that don't exist in 23-24
  console.log('\n── NEW IN 2024-25 (not in 2023-24) ──');
  const names2324 = new Set(fy2324.map(x => x.ledgerName));
  const newEntries = fy2425.filter(x => !names2324.has(x.ledgerName) && (x.category === 'asset' || x.category === 'liability'));
  for (const x of newEntries) {
    console.log('  🆕 NEW     | ' + x.ledgerName.padEnd(35) + ' | Rs.' + x.amount.toLocaleString('en-IN').padStart(12) + ' ' + x.drCr + ' (' + x.category + ')');
  }

  // P&L Account check (special - carries forward as Reserves & Surplus)
  console.log('\n── P&L CARRY-FORWARD (23-24 P&L → 24-25 Reserves) ──');
  const pl2324 = fy2324.find(x => x.ledgerName.includes('Profit & Loss'));
  const pl2425 = fy2425.find(x => x.ledgerName.includes('Profit & Loss'));
  if (pl2324) {
    console.log('  23-24 P&L Account:  Rs.' + pl2324.amount.toLocaleString('en-IN') + ' ' + pl2324.drCr);
  }
  if (pl2425) {
    console.log('  24-25 P&L Account:  Rs.' + pl2425.amount.toLocaleString('en-IN') + ' ' + pl2425.drCr);
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  23-24 BS entries:     ' + bsEntries.length);
  console.log('  Carried forward:      ' + ok.length);
  console.log('  MISSING in 24-25:     ' + missing.length);
  console.log('  New in 24-25:         ' + newEntries.length);

  if (missing.length > 0) {
    console.log('\n  ❌ MISSING ENTRIES THAT NEED TO BE ADDED:');
    for (const m of missing) {
      console.log('     - ' + m.ledgerName + ': Rs.' + m.amount.toLocaleString('en-IN') + ' ' + m.drCr + ' (' + m.category + ', ' + m.parentGroup + ')');
    }
  } else {
    console.log('\n  ✅ All 23-24 balance sheet items exist in 24-25');
  }

  await mongoose.disconnect();
}
run();
