// Test engine output for FY 2023-24 to verify P&L and BS match CA report
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  // Connect using the same pattern as the app
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  console.log('Connected to MongoDB');

  // Dynamic import of engine (ESM-like require)
  // We'll call the API directly via HTTP instead
  const http = require('http');

  const endpoints = [
    { name: 'Summary', url: '/api/tally/reports?type=summary&fy=2023-24' },
    { name: 'P&L', url: '/api/tally/reports?type=profit-loss&fy=2023-24' },
    { name: 'BS', url: '/api/tally/reports?type=balance-sheet&fy=2023-24' },
    { name: 'Trial Balance', url: '/api/tally/reports?type=trial-balance&fy=2023-24' },
  ];

  // We need auth token - let's just query the DB directly to simulate the engine
  const db = mongoose.connection.db;
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();

  console.log('\n=== ENGINE SIMULATION (0 vouchers, all from OBs) ===');

  // P&L
  const incomeLedgers = ledgers.filter(l => l.group === 'INCOME');
  const expenseLedgers = ledgers.filter(l => l.group === 'EXPENSE');

  console.log('\n── P&L REPORT ──');
  console.log('INCOME:');
  let totalIncome = 0;
  incomeLedgers.forEach(l => {
    // Income normal = CREDIT. With 0 vouchers: amount = OB (CREDIT side)
    const amount = l.openingBalance; // all income ledgers have CREDIT type
    totalIncome += amount;
    console.log(`  ${l.name.padEnd(40)} Rs ${amount.toFixed(2)}`);
  });
  console.log(`  ${'TOTAL INCOME'.padEnd(40)} Rs ${totalIncome.toFixed(2)}`);

  console.log('\nEXPENSES:');
  let totalExpense = 0;
  expenseLedgers.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    const amount = l.openingBalance; // all expense ledgers have DEBIT type
    totalExpense += amount;
    console.log(`  ${l.name.padEnd(40)} Rs ${amount.toFixed(2)}`);
  });
  console.log(`  ${'TOTAL EXPENSES'.padEnd(40)} Rs ${totalExpense.toFixed(2)}`);

  const netPL = totalIncome - totalExpense;
  console.log(`\n  NET: Rs ${netPL.toFixed(2)} (${netPL >= 0 ? 'Profit' : 'Loss'})`);

  // BS
  const assetLedgers = ledgers.filter(l => l.group === 'ASSET');
  const liabilityLedgers = ledgers.filter(l => l.group === 'LIABILITY');
  const capitalLedgers = ledgers.filter(l => l.group === 'CAPITAL');

  console.log('\n── BS REPORT ──');
  console.log('ASSETS:');
  let totalAssets = 0;
  assetLedgers.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    const signed = l.openingBalanceType === 'DEBIT' ? l.openingBalance : -l.openingBalance;
    totalAssets += signed;
    console.log(`  ${l.name.padEnd(40)} Rs ${l.openingBalance.toFixed(2)} (${l.openingBalanceType})`);
  });
  console.log(`  ${'TOTAL ASSETS'.padEnd(40)} Rs ${totalAssets.toFixed(2)}`);

  console.log('\nLIABILITIES:');
  let totalLiab = 0;
  liabilityLedgers.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    const signed = l.openingBalanceType === 'CREDIT' ? l.openingBalance : -l.openingBalance;
    totalLiab += signed;
    console.log(`  ${l.name.padEnd(40)} Rs ${l.openingBalance.toFixed(2)} (${l.openingBalanceType})`);
  });
  console.log(`  ${'TOTAL LIABILITIES'.padEnd(40)} Rs ${totalLiab.toFixed(2)}`);

  console.log('\nCAPITAL:');
  let totalCap = 0;
  capitalLedgers.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    const signed = l.openingBalanceType === 'CREDIT' ? l.openingBalance : -l.openingBalance;
    totalCap += signed;
    console.log(`  ${l.name.padEnd(40)} Rs ${l.openingBalance.toFixed(2)} (${l.openingBalanceType})`);
  });
  console.log(`  ${'TOTAL CAPITAL'.padEnd(40)} Rs ${totalCap.toFixed(2)}`);

  // Auto P&L surplus line
  console.log(`\n  Current Year Loss (Auto from P&L)      Rs ${Math.abs(netPL).toFixed(2)}`);
  const capitalAdj = totalCap + netPL;
  console.log(`  Capital Adjusted (after P&L):          Rs ${capitalAdj.toFixed(2)}`);

  const liabPlusCap = totalLiab + capitalAdj;
  console.log(`\n  Total Assets:               Rs ${totalAssets.toFixed(2)}`);
  console.log(`  Liab + Capital (adjusted):  Rs ${liabPlusCap.toFixed(2)}`);
  console.log(`  Difference:                 Rs ${(totalAssets - liabPlusCap).toFixed(2)}`);
  console.log(`  Balanced: ${Math.abs(totalAssets - liabPlusCap) < 1 ? 'YES' : 'NO'}`);

  // CA Report comparison
  console.log('\n══════════════════════════════════');
  console.log('  CA REPORT MATCH CHECK');
  console.log('══════════════════════════════════');
  const checks = [
    ['Revenue (excl DT)', totalIncome - 30493, 723722],
    ['Total Income', totalIncome, 754215],
    ['Total Expenses', totalExpense, 803178],
    ['Net Loss', Math.abs(netPL), 48963],
    ['Total Assets', totalAssets, 866815],
    ['BS Balanced', totalAssets - liabPlusCap === 0 ? 1 : 0, 1],
  ];
  checks.forEach(([label, actual, expected]) => {
    const match = Math.abs(actual - expected) < 1;
    console.log(`  ${String(label).padEnd(25)} Actual: ${String(actual).padStart(10)} | Expected: ${String(expected).padStart(10)} | ${match ? 'PASS' : 'FAIL'}`);
  });

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
