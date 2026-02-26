/**
 * FY 2024-25 Depreciation & BS Fix
 * 
 * Uses exact same WDV rates from the CA's depreciation chart:
 *   Computer:              63.16% (3yr useful life)
 *   Furniture & Fixture:   25.89% (10yr useful life)
 *   Software:              63.16% (3yr useful life)
 *   Machinery & Equipment: 25.89% (10yr useful life)
 *   JBL Speaker:           25.89% (10yr useful life)
 *   Mobile:                45.07% (5yr useful life)
 * 
 * Opening WDVs = Cost - FY 2023-24 CA Report Depreciation
 * 
 * Also fixes Reserves calculation:
 *   CA Report Reserves at 31/03/2024 = -₹45,192 (already includes FY 23-24 loss)
 *   Opening Reserves for FY 24-25 = -₹45,192
 *   Closing = -₹45,192 + Net Profit (after depreciation)
 * 
 * Run: node scripts/fix-fy2425-depreciation.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const FY = '2024-25';
const AS_ON = '31-03-2025';

// Depreciation chart: Asset → { cost, depFY2324 (from CA report), rate, usefulLife }
const assets = [
  { name: 'Computer',                cost: 482000, depCA2324: 239516, rate: 0.6316, life: 3 },
  { name: 'Furniture & Fixture',     cost: 42100,  depCA2324: 10898,  rate: 0.2589, life: 10 },
  { name: 'Software',                cost: 18000,  depCA2324: 11369,  rate: 0.6316, life: 3 },
  { name: 'Machinery & Equipment',   cost: 41500,  depCA2324: 10743,  rate: 0.2589, life: 10 },
  { name: 'JBL Speaker',             cost: 27500,  depCA2324: 1653,   rate: 0.2589, life: 10 },
  { name: 'Mobile',                  cost: 68000,  depCA2324: 7202,   rate: 0.4507, life: 5 },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  // ── Compute Depreciation ──
  console.log('═'.repeat(85));
  console.log('  FY 2024-25 DEPRECIATION COMPUTATION (WDV Method, Companies Act 2013)');
  console.log('═'.repeat(85));
  console.log(`  ${'Asset'.padEnd(28)} ${'Cost'.padStart(10)} ${'Opening WDV'.padStart(12)} ${'Rate'.padStart(8)} ${'Dep 24-25'.padStart(12)} ${'Closing WDV'.padStart(12)}`);
  console.log('  ' + '─'.repeat(82));

  let totalDep = 0;
  let totalClosingWDV = 0;
  const depEntries = [];

  for (const a of assets) {
    const openingWDV = a.cost - a.depCA2324; // Net block from CA report
    const dep = Math.round(openingWDV * a.rate * 100) / 100;
    const closingWDV = Math.round((openingWDV - dep) * 100) / 100;
    
    totalDep += dep;
    totalClosingWDV += closingWDV;
    depEntries.push({ name: a.name, dep, closingWDV, openingWDV });

    console.log(`  ${a.name.padEnd(28)} ${('₹' + a.cost.toLocaleString('en-IN')).padStart(10)} ${('₹' + openingWDV.toLocaleString('en-IN')).padStart(12)} ${(a.rate * 100).toFixed(2).padStart(7)}% ${('₹' + dep.toLocaleString('en-IN')).padStart(12)} ${('₹' + closingWDV.toLocaleString('en-IN')).padStart(12)}`);
  }

  totalDep = Math.round(totalDep * 100) / 100;
  totalClosingWDV = Math.round(totalClosingWDV * 100) / 100;

  console.log('  ' + '─'.repeat(82));
  console.log(`  ${'TOTAL'.padEnd(28)} ${' '.repeat(10)} ${' '.repeat(12)} ${' '.repeat(8)} ${('₹' + totalDep.toLocaleString('en-IN')).padStart(12)} ${('₹' + totalClosingWDV.toLocaleString('en-IN')).padStart(12)}`);

  // ── Get current state ──
  const existing = await coll.find({ financialYear: FY }).toArray();
  let incTotal = 0, expTotal = 0;
  existing.forEach(e => {
    if (e.category === 'income') incTotal += e.amount;
    if (e.category === 'expense') expTotal += e.amount;
  });

  const oldProfit = Math.round((incTotal - expTotal) * 100) / 100;
  const newProfit = Math.round((oldProfit - totalDep) * 100) / 100;

  // Reserves: CA report closing at 31/03/2024 = -45,192 (ALREADY includes FY 23-24 loss)
  const openingReserves = -45192;
  const closingReserves = Math.round((openingReserves + newProfit) * 100) / 100;

  console.log('\n  ── P&L IMPACT ──');
  console.log(`  Income:                    ₹${incTotal.toLocaleString('en-IN')}`);
  console.log(`  Expenses (before dep):     ₹${expTotal.toLocaleString('en-IN')}`);
  console.log(`  + Depreciation:            ₹${totalDep.toLocaleString('en-IN')}`);
  console.log(`  Expenses (after dep):      ₹${(expTotal + totalDep).toLocaleString('en-IN')}`);
  console.log(`  Net Profit (before dep):   ₹${oldProfit.toLocaleString('en-IN')}`);
  console.log(`  Net Profit (after dep):    ₹${newProfit.toLocaleString('en-IN')}`);
  console.log('\n  ── RESERVES ──');
  console.log(`  Opening (31/03/2024):      ₹${openingReserves.toLocaleString('en-IN')} (from CA report, includes FY 23-24 loss)`);
  console.log(`  + FY 2024-25 Net Profit:   ₹${newProfit.toLocaleString('en-IN')}`);
  console.log(`  Closing (31/03/2025):      ₹${closingReserves.toLocaleString('en-IN')} ${closingReserves >= 0 ? '(positive reserves!)' : '(accumulated loss)'}`);

  // ── DELETE old entries that need replacement ──
  const toDelete = [
    'Fixed Assets (Opening Net Block)',
    'Reserves & Surplus',
  ];

  for (const name of toDelete) {
    const del = await coll.deleteMany({ financialYear: FY, ledgerName: name });
    if (del.deletedCount > 0) console.log(`\n  Deleted: ${name} (${del.deletedCount} entry)`);
  }

  // ── INSERT new entries ──
  const newEntries = [];
  const add = (ledger, parent, cat, amount, drCr, notes) => {
    newEntries.push({
      ledgerName: ledger, parentGroup: parent, category: cat,
      amount: Math.round(Math.abs(amount) * 100) / 100,
      drCr, financialYear: FY, asOnDate: AS_ON,
      notes: notes || '', createdBy: 'depreciation-calc',
      createdAt: new Date(), updatedAt: new Date()
    });
  };

  // Depreciation expense entries
  for (const d of depEntries) {
    add(`Depreciation - ${d.name}`, 'Depreciation', 'expense', d.dep, 'Dr',
      `WDV: ₹${d.openingWDV.toLocaleString('en-IN')} → ₹${d.closingWDV.toLocaleString('en-IN')}`);
  }

  // Fixed Assets closing net block (old assets only)
  add('Fixed Assets (Net Block)', 'Fixed Assets', 'asset', totalClosingWDV, 'Dr',
    `Old assets after FY 2024-25 depreciation of ₹${totalDep.toLocaleString('en-IN')}`);

  // Corrected Reserves & Surplus
  if (closingReserves >= 0) {
    add('Reserves & Surplus', 'Reserves', 'liability', closingReserves, 'Cr',
      `Opening ₹${openingReserves.toLocaleString('en-IN')} + Net Profit ₹${newProfit.toLocaleString('en-IN')}`);
  } else {
    add('Reserves & Surplus', 'Reserves', 'liability', Math.abs(closingReserves), 'Dr',
      `Opening ₹${openingReserves.toLocaleString('en-IN')} + Net Profit ₹${newProfit.toLocaleString('en-IN')} (still accumulated loss)`);
  }

  console.log('\n  New entries to insert:');
  newEntries.forEach(e => {
    console.log(`    [${e.category.padEnd(9)}] ${e.drCr} | ${e.ledgerName.padEnd(40)} | ₹${e.amount.toLocaleString('en-IN').padStart(12)}`);
  });

  const result = await coll.insertMany(newEntries);
  console.log(`\n  ✅ Inserted ${result.insertedCount} entries`);

  // ── FINAL BS CHECK ──
  const allEntries = await coll.find({ financialYear: FY }).toArray();
  
  let astT = 0, libT = 0, incT = 0, expT = 0;

  console.log('\n' + '═'.repeat(85));
  console.log('  COMPLETE FY 2024-25 BALANCE SHEET (after depreciation)');
  console.log('═'.repeat(85));

  console.log('\n  ── ASSETS ──');
  const assetEntries = allEntries.filter(e => e.category === 'asset');
  assetEntries.forEach(e => {
    const eff = e.drCr === 'Dr' ? e.amount : -e.amount;
    astT += eff;
    console.log(`  ${e.ledgerName.padEnd(42)} ${e.drCr} ₹${e.amount.toLocaleString('en-IN').padStart(12)}`);
  });
  astT = Math.round(astT * 100) / 100;
  console.log(`  ${'─'.repeat(60)}`);
  console.log(`  ${'TOTAL ASSETS'.padEnd(45)} ₹${astT.toLocaleString('en-IN').padStart(12)}`);

  console.log('\n  ── EQUITY & LIABILITIES ──');
  const libEntries = allEntries.filter(e => e.category === 'liability');
  libEntries.forEach(e => {
    const eff = e.drCr === 'Cr' ? e.amount : -e.amount;
    libT += eff;
    console.log(`  ${e.ledgerName.padEnd(42)} ${e.drCr} ₹${e.amount.toLocaleString('en-IN').padStart(12)}`);
  });
  libT = Math.round(libT * 100) / 100;
  console.log(`  ${'─'.repeat(60)}`);
  console.log(`  ${'TOTAL EQUITY + LIABILITIES'.padEnd(45)} ₹${libT.toLocaleString('en-IN').padStart(12)}`);

  console.log('\n  ── PROFIT & LOSS ──');
  allEntries.filter(e => e.category === 'income').forEach(e => incT += e.amount);
  allEntries.filter(e => e.category === 'expense').forEach(e => expT += e.amount);
  incT = Math.round(incT * 100) / 100;
  expT = Math.round(expT * 100) / 100;
  console.log(`  Income:              ₹${incT.toLocaleString('en-IN')}`);
  console.log(`  Expenses (with dep): ₹${expT.toLocaleString('en-IN')}`);
  console.log(`  Net Profit:          ₹${(incT - expT).toLocaleString('en-IN')}`);

  const diff = Math.round((astT - libT) * 100) / 100;
  console.log('\n' + '═'.repeat(85));
  console.log(`  Total Assets:       ₹${astT.toLocaleString('en-IN')}`);
  console.log(`  Total Equity+Lib:   ₹${libT.toLocaleString('en-IN')}`);
  console.log(`  Difference:         ₹${diff.toLocaleString('en-IN')} ${Math.abs(diff) < 1 ? '✅ BALANCED' : ''}`);
  
  if (Math.abs(diff) > 1) {
    console.log(`\n  Note: Gap of ₹${Math.abs(diff).toLocaleString('en-IN')} likely due to:`);
    console.log(`  • Other bank accounts not yet captured (Union Bank UBINX3879 seen in contras)`);
    console.log(`  • FY 2023-24 receivables collected / liabilities repaid during FY 2024-25`);
    console.log(`  • Pending depreciation on new assets (Office Equip, Resort) — needs CA rates`);
    console.log(`  • These will be adjusted by the CA during FY 2024-25 audit`);
  }
  
  console.log('═'.repeat(85));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
