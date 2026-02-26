/**
 * Compare FY 2023-24 Closing BS → FY 2024-25 Opening/Current BS
 * Shows how the balance sheet carries forward between years
 * Run: node scripts/compare-fy-carryforward.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  const fy2324 = await coll.find({ financialYear: '2023-24' }).toArray();
  const fy2425 = await coll.find({ financialYear: '2024-25' }).toArray();

  console.log('═'.repeat(90));
  console.log('  FY 2023-24 CLOSING BS  →  FY 2024-25 CURRENT STATE');
  console.log('═'.repeat(90));

  // ── FY 2023-24 Balance Sheet (closing) ──
  const bs2324 = fy2324.filter(e => e.category === 'asset' || e.category === 'liability');
  const pl2324 = fy2324.filter(e => e.category === 'income' || e.category === 'expense');

  // Calculate FY 2023-24 P&L
  let inc2324 = 0, exp2324 = 0;
  pl2324.forEach(e => {
    if (e.category === 'income') inc2324 += e.amount;
    if (e.category === 'expense') exp2324 += e.amount;
  });
  const netPL2324 = inc2324 - exp2324; // negative = loss

  console.log('\n  ── FY 2023-24 P&L Summary ──');
  console.log(`  Income:    ₹${inc2324.toLocaleString('en-IN')}`);
  console.log(`  Expenses:  ₹${exp2324.toLocaleString('en-IN')}`);
  console.log(`  Net P&L:   ₹${netPL2324.toLocaleString('en-IN')} (${netPL2324 >= 0 ? 'Profit' : 'Loss'})`);

  // ── FY 2023-24 Balance Sheet Items ──
  console.log('\n  ── FY 2023-24 CLOSING BALANCE SHEET ──');
  console.log('  ' + '-'.repeat(86));
  console.log(`  ${'Ledger'.padEnd(40)} ${'Cat'.padEnd(10)} ${'Dr/Cr'.padEnd(6)} ${'Amount'.padStart(12)} ${'Effective'.padStart(12)}`);
  console.log('  ' + '-'.repeat(86));

  let totalAssets2324 = 0, totalLiab2324 = 0;
  bs2324.forEach(e => {
    let effective;
    if (e.category === 'asset') {
      effective = e.drCr === 'Dr' ? e.amount : -e.amount;
      totalAssets2324 += effective;
    } else {
      effective = e.drCr === 'Cr' ? e.amount : -e.amount;
      totalLiab2324 += effective;
    }
    console.log(`  ${e.ledgerName.padEnd(40)} ${e.category.padEnd(10)} ${e.drCr.padEnd(6)} ₹${e.amount.toLocaleString('en-IN').padStart(10)} ₹${effective.toLocaleString('en-IN').padStart(10)}`);
  });
  console.log('  ' + '-'.repeat(86));
  console.log(`  ${'Total Assets'.padEnd(58)} ₹${totalAssets2324.toLocaleString('en-IN').padStart(10)}`);
  console.log(`  ${'Total Equity+Liabilities'.padEnd(58)} ₹${totalLiab2324.toLocaleString('en-IN').padStart(10)}`);

  // ── FY 2024-25 Current State ──
  console.log('\n\n  ── FY 2024-25 CURRENT ENTRIES ──');
  console.log('  ' + '-'.repeat(86));
  console.log(`  ${'Ledger'.padEnd(40)} ${'Cat'.padEnd(10)} ${'Dr/Cr'.padEnd(6)} ${'Amount'.padStart(12)}`);
  console.log('  ' + '-'.repeat(86));

  // Group by category
  const cats = { asset: [], liability: [], income: [], expense: [] };
  fy2425.forEach(e => cats[e.category]?.push(e));

  let inc2425 = 0, exp2425 = 0, ast2425 = 0, lib2425 = 0;
  for (const cat of ['income', 'expense', 'asset', 'liability']) {
    if (cats[cat].length === 0) continue;
    console.log(`\n  [${cat.toUpperCase()}]`);
    cats[cat].forEach(e => {
      if (cat === 'income') inc2425 += e.amount;
      if (cat === 'expense') exp2425 += e.amount;
      if (cat === 'asset') ast2425 += (e.drCr === 'Cr' ? -e.amount : e.amount);
      if (cat === 'liability') lib2425 += (e.drCr === 'Cr' ? e.amount : -e.amount);
      console.log(`  ${e.ledgerName.padEnd(40)} ${cat.padEnd(10)} ${e.drCr.padEnd(6)} ₹${e.amount.toLocaleString('en-IN').padStart(10)}`);
    });
  }

  const netPL2425 = inc2425 - exp2425;

  // ── ANALYSIS: What's missing in FY 2024-25? ──
  console.log('\n\n' + '═'.repeat(90));
  console.log('  ANALYSIS: FY 2024-25 vs FY 2023-24 CARRYFORWARD');
  console.log('═'.repeat(90));

  console.log('\n  In accounting, FY 2023-24 closing BS → FY 2024-25 opening BS:');
  console.log('  • P&L (income/expense) resets to zero each year');
  console.log('  • Net Profit/Loss flows into Reserves & Surplus');
  console.log('  • All BS items (assets, liabilities) carry forward\n');

  // Expected opening for FY 2024-25
  console.log('  FY 2023-24 Closing Reserves & Surplus:  ₹-45,192 (accumulated loss, Dr)');
  console.log(`  FY 2023-24 Net Loss (after DT):         ₹${netPL2324.toLocaleString('en-IN')}`);
  console.log('  Note: Deferred Tax benefit ₹30,493 reduced the loss');
  console.log(`  CA Report Loss after tax:               ₹-48,963`);
  console.log(`  Expected Opening Reserves 2024-25:      ₹${(-45192 + (-48963)).toLocaleString('en-IN')} (₹-45,192 + ₹-48,963 = ₹-94,155)`);

  console.log('\n  ── MISSING BS ITEMS IN FY 2024-25 ──');
  
  const missingItems = [];
  
  // Check each 2023-24 BS item
  const bs2324Items = [
    { ledger: 'Share Capital', expected: 610000, note: 'Same unless new shares issued' },
    { ledger: 'Reserves & Surplus', expected: -94155, note: 'Opening ₹-45,192 + FY23-24 loss ₹-48,963' },
    { ledger: 'Short-Term Provisions', expected: 7500, note: 'Carry forward unless settled' },
    { ledger: 'Other Current Liabilities', expected: 325000, note: 'Carry forward unless repaid' },
    { ledger: 'Deferred Tax Liability', expected: -30493, note: 'DTA, may change with FY24-25 profit' },
    { ledger: 'Fixed Assets (Net Block)', expected: 397719, note: 'Gross minus accumulated depreciation' },
    { ledger: 'Cash & Cash Equivalents', expected: 329327, note: 'Opening cash balance' },
    { ledger: 'Other Current Assets', expected: 139769, note: 'Carry forward unless collected' },
  ];

  for (const item of bs2324Items) {
    const found = fy2425.find(e => e.ledgerName === item.ledger);
    const status = found ? '✅ EXISTS' : '❌ MISSING';
    if (!found) missingItems.push(item);
    console.log(`  ${status}  ${item.ledger.padEnd(35)} Expected Opening: ₹${item.expected.toLocaleString('en-IN').padStart(10)}  (${item.note})`);
  }

  console.log('\n  ── FY 2024-25 P&L SUMMARY ──');
  console.log(`  Income:    ₹${inc2425.toLocaleString('en-IN')}`);
  console.log(`  Expenses:  ₹${exp2425.toLocaleString('en-IN')}`);
  console.log(`  Net P&L:   ₹${netPL2425.toLocaleString('en-IN')} (${netPL2425 >= 0 ? 'Profit' : 'Loss'})`);

  console.log('\n  ── FY 2024-25 BS TOTALS (current, incomplete) ──');
  console.log(`  Assets:          ₹${ast2425.toLocaleString('en-IN')}`);
  console.log(`  Equity+Liab:     ₹${lib2425.toLocaleString('en-IN')}`);
  
  // What BS should look like
  // Assets = Opening Assets + New Assets purchased - Depreciation + Cash movements
  // Liabilities = Opening Liabilities + Net Profit added to Reserves
  
  console.log('\n  ── EXPECTED FY 2024-25 CLOSING BS (estimated) ──');
  // FY 2024-25 has assets: Office Equipment ₹32,050 + Resort Project ₹2,44,967 + Investments ₹25,000
  // These are NEW acquisitions during FY 2024-25
  // Opening fixed assets from 2023-24: ₹3,97,719 (gross ₹6,79,100 - dep ₹2,81,381)
  // New assets: Office Equipment ₹32,050
  // Depreciation for 2024-25 needs to be calculated
  
  const openingFixedAssets = 397719;
  const newAssets2425 = 32050 + 244967; // Office Equipment + Resort Project
  const closingGross = 679100 + newAssets2425;
  
  console.log(`  Opening Fixed Assets (Net):  ₹${openingFixedAssets.toLocaleString('en-IN')}`);
  console.log(`  + New Assets (2024-25):      ₹${newAssets2425.toLocaleString('en-IN')} (Office Equip ₹32,050 + Resort ₹2,44,967)`);
  console.log(`  Opening Cash:                ₹${(329327).toLocaleString('en-IN')}`);
  console.log(`  Opening Share Capital:       ₹${(610000).toLocaleString('en-IN')}`);
  console.log(`  Opening Reserves (loss):     ₹${(-94155).toLocaleString('en-IN')}`);
  console.log(`  + FY 2024-25 Net Profit:     ₹${netPL2425.toLocaleString('en-IN')}`);
  console.log(`  Closing Reserves:            ₹${(-94155 + netPL2425).toLocaleString('en-IN')}`);

  if (missingItems.length > 0) {
    console.log('\n  ⚠️  FY 2024-25 is INCOMPLETE — missing BS carryforward items from FY 2023-24');
    console.log(`  Missing: ${missingItems.map(m => m.ledger).join(', ')}`);
  } else {
    console.log('\n  ✅ All BS items carried forward');
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
