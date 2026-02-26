/**
 * Add missing Balance Sheet entries to FY 2024-25
 * Carries forward FY 2023-24 closing BS + FY 2024-25 actuals
 * 
 * Cash: ₹90,000 (user confirmed)
 * Kotak Bank: ₹43,750.97 (from bank statement closing)
 * 
 * Run: node scripts/add-fy2425-bs-entries.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const FY = '2024-25';
const AS_ON = '31-03-2025';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  // Get current FY 2024-25 entries
  const existing = await coll.find({ financialYear: FY }).toArray();
  console.log(`Existing FY ${FY} entries: ${existing.length}\n`);

  // Calculate current P&L from existing entries
  let totalIncome = 0, totalExpense = 0;
  existing.forEach(e => {
    if (e.category === 'income') totalIncome += e.amount;
    if (e.category === 'expense') totalExpense += e.amount;
  });
  const netProfit = totalIncome - totalExpense;

  console.log('Current P&L:');
  console.log(`  Income:   ₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`  Expenses: ₹${totalExpense.toLocaleString('en-IN')}`);
  console.log(`  Net P&L:  ₹${netProfit.toLocaleString('en-IN')} (${netProfit >= 0 ? 'Profit' : 'Loss'})`);

  // FY 2023-24 closing → FY 2024-25 opening
  // Reserves: Opening -₹45,192 + CA Report Loss after tax -₹48,963 = -₹94,155
  const openingReserves = -94155;
  // Closing Reserves = Opening + FY 2024-25 Net Profit
  const closingReserves = Math.round((openingReserves + netProfit) * 100) / 100;

  console.log(`\nReserves calculation:`);
  console.log(`  FY 2023-24 Closing Reserves:  ₹-45,192`);
  console.log(`  + FY 2023-24 Loss after tax:  ₹-48,963`);
  console.log(`  = Opening Reserves 2024-25:   ₹${openingReserves.toLocaleString('en-IN')}`);
  console.log(`  + FY 2024-25 Net Profit:      ₹${netProfit.toLocaleString('en-IN')}`);
  console.log(`  = Closing Reserves 2024-25:   ₹${closingReserves.toLocaleString('en-IN')}`);

  // New BS entries to add
  const newEntries = [];
  const add = (ledger, parent, cat, amount, drCr, notes) => {
    newEntries.push({
      ledgerName: ledger,
      parentGroup: parent,
      category: cat,
      amount: Math.round(amount * 100) / 100,
      drCr,
      financialYear: FY,
      asOnDate: AS_ON,
      notes: notes || '',
      createdBy: 'bs-carryforward',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  };

  // ═══════════════════════════════════════════════
  // ASSETS — Balance Sheet
  // ═══════════════════════════════════════════════

  // Fixed Assets (Opening Net Block from FY 2023-24)
  // Gross ₹6,79,100 - Accumulated Dep ₹2,81,381 = Net ₹3,97,719
  // Note: FY 2024-25 depreciation on these old assets needs CA computation
  add('Fixed Assets (Opening Net Block)', 'Fixed Assets', 'asset', 397719, 'Dr',
    'Carried from FY 2023-24: Gross ₹6,79,100 - Dep ₹2,81,381. Depreciation for FY 2024-25 pending.');

  // Cash & Bank Balances (actual closing balances)
  add('Cash in Hand', 'Current Assets', 'asset', 90000, 'Dr', 'Closing cash balance FY 2024-25');
  add('Kotak Bank', 'Current Assets', 'asset', 43750.97, 'Dr', 'Kotak bank closing balance from statement');

  // Other Current Assets (carried from FY 2023-24)
  // Note 10: Fees Receivable ₹1,11,769 + Sundry Advances ₹28,000
  add('Other Current Assets', 'Current Assets', 'asset', 139769, 'Dr',
    'Carried from FY 2023-24 (Fees Receivable + Sundry Advances). May need adjustment.');

  // ═══════════════════════════════════════════════
  // EQUITY & LIABILITIES — Balance Sheet
  // ═══════════════════════════════════════════════

  // Share Capital (same as FY 2023-24, no new shares issued)
  add('Share Capital', 'Share Capital', 'liability', 610000, 'Cr', 'Same as FY 2023-24');

  // Reserves & Surplus
  if (closingReserves >= 0) {
    add('Reserves & Surplus', 'Reserves', 'liability', closingReserves, 'Cr',
      `Opening ₹${openingReserves.toLocaleString('en-IN')} + Profit ₹${netProfit.toLocaleString('en-IN')}`);
  } else {
    add('Reserves & Surplus', 'Reserves', 'liability', Math.abs(closingReserves), 'Dr',
      `Opening ₹${openingReserves.toLocaleString('en-IN')} + Profit ₹${netProfit.toLocaleString('en-IN')} (still negative = accumulated loss)`);
  }

  // Deferred Tax (DTA carried from FY 2023-24, may change after FY 24-25 audit)
  add('Deferred Tax Liability', 'Provisions', 'liability', 30493, 'Dr',
    'DTA carried from FY 2023-24. May change after FY 2024-25 audit.');

  // Short-Term Provisions (carried from FY 2023-24)
  add('Short-Term Provisions', 'Provisions', 'liability', 7500, 'Cr',
    'Carried from FY 2023-24');

  // Other Current Liabilities (carried from FY 2023-24)
  add('Other Current Liabilities', 'Current Liabilities', 'liability', 325000, 'Cr',
    'Carried from FY 2023-24. May need adjustment if repaid.');

  // ═══════════════════════════════════════════════
  // DISPLAY & INSERT
  // ═══════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('  NEW BS ENTRIES TO ADD');
  console.log('═'.repeat(80));

  newEntries.forEach(e => {
    console.log(`  [${e.category.padEnd(9)}] ${e.drCr} | ${e.ledgerName.padEnd(40)} | ₹${e.amount.toLocaleString('en-IN').padStart(12)}`);
  });

  // Insert
  const result = await coll.insertMany(newEntries);
  console.log(`\n✅ Inserted ${result.insertedCount} new BS entries\n`);

  // Now compute full BS
  const allEntries = await coll.find({ financialYear: FY }).toArray();
  
  let astTotal = 0, libTotal = 0, incTotal = 0, expTotal = 0;
  
  console.log('═'.repeat(80));
  console.log('  COMPLETE FY 2024-25 BALANCE SHEET');
  console.log('═'.repeat(80));

  // Assets
  console.log('\n  ── ASSETS ──');
  const assets = allEntries.filter(e => e.category === 'asset');
  assets.forEach(e => {
    const eff = e.drCr === 'Dr' ? e.amount : -e.amount;
    astTotal += eff;
    console.log(`  ${e.ledgerName.padEnd(40)} ${e.drCr} ₹${e.amount.toLocaleString('en-IN').padStart(12)}`);
  });
  console.log(`  ${'─'.repeat(60)}`);
  console.log(`  ${'TOTAL ASSETS'.padEnd(43)} ₹${astTotal.toLocaleString('en-IN').padStart(12)}`);

  // Equity & Liabilities
  console.log('\n  ── EQUITY & LIABILITIES ──');
  const liabilities = allEntries.filter(e => e.category === 'liability');
  liabilities.forEach(e => {
    const eff = e.drCr === 'Cr' ? e.amount : -e.amount;
    libTotal += eff;
    console.log(`  ${e.ledgerName.padEnd(40)} ${e.drCr} ₹${e.amount.toLocaleString('en-IN').padStart(12)}`);
  });
  console.log(`  ${'─'.repeat(60)}`);
  console.log(`  ${'TOTAL EQUITY + LIABILITIES'.padEnd(43)} ₹${libTotal.toLocaleString('en-IN').padStart(12)}`);

  // P&L
  console.log('\n  ── PROFIT & LOSS ──');
  allEntries.filter(e => e.category === 'income').forEach(e => incTotal += e.amount);
  allEntries.filter(e => e.category === 'expense').forEach(e => expTotal += e.amount);
  console.log(`  Income:    ₹${incTotal.toLocaleString('en-IN')}`);
  console.log(`  Expenses:  ₹${expTotal.toLocaleString('en-IN')}`);
  console.log(`  Net P&L:   ₹${(incTotal - expTotal).toLocaleString('en-IN')}`);

  // Balance check
  const diff = Math.round((astTotal - libTotal) * 100) / 100;
  console.log('\n' + '═'.repeat(80));
  console.log(`  Assets:     ₹${astTotal.toLocaleString('en-IN')}`);
  console.log(`  Equity+Lib: ₹${libTotal.toLocaleString('en-IN')}`);
  console.log(`  Difference: ₹${diff.toLocaleString('en-IN')} ${diff === 0 ? '✅ BALANCED' : '⚠️  (Depreciation on old assets pending CA computation)'}`);
  console.log('═'.repeat(80));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
