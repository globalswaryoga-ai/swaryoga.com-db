/**
 * Check current FY 2024-25 DB state — balances and vouchers
 * Run: node scripts/check-fy2425-state.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  const entries = await col.find({ financialYear: '2024-25' }).sort({ category: 1, ledgerName: 1 }).toArray();
  console.log('FY 2024-25 Balance Entries:', entries.length);

  let totalAssets = 0, totalLiab = 0, totalIncome = 0, totalExpense = 0;
  entries.forEach(e => {
    const display = e.drCr === 'Dr' ? '+' : '-';
    if (e.category === 'asset') totalAssets += e.amount;
    else if (e.category === 'liability') totalLiab += e.amount;
    else if (e.category === 'income') totalIncome += e.amount;
    else if (e.category === 'expense') totalExpense += e.amount;
    console.log(`  [${e.category.padEnd(9)}] ${display} Rs.${e.amount.toLocaleString('en-IN').padStart(12)} | ${e.drCr} | ${e.ledgerName.padEnd(45)} | ${e.parentGroup || ''}`);
  });

  console.log('\n--- TOTALS ---');
  console.log('Assets:      Rs.' + totalAssets.toLocaleString('en-IN'));
  console.log('Liabilities: Rs.' + totalLiab.toLocaleString('en-IN'));
  console.log('Income:      Rs.' + totalIncome.toLocaleString('en-IN'));
  console.log('Expenses:    Rs.' + totalExpense.toLocaleString('en-IN'));
  console.log('Net Profit:  Rs.' + (totalIncome - totalExpense).toLocaleString('en-IN'));
  console.log('BS Gap:      Rs.' + (totalAssets - totalLiab - (totalIncome - totalExpense)).toLocaleString('en-IN'));

  // Voucher summary
  const vCol = mongoose.connection.collection('tally_manual_vouchers');
  const vouchers = await vCol.find({ financialYear: '2024-25' }).toArray();
  console.log('\nVouchers:', vouchers.length);
  const byType = {};
  vouchers.forEach(v => {
    if (!byType[v.voucherType]) byType[v.voucherType] = { count: 0, total: 0 };
    byType[v.voucherType].count++;
    byType[v.voucherType].total += v.amount;
  });
  Object.entries(byType).forEach(([t, d]) => {
    console.log(`  ${t}: ${d.count} entries, Rs.${d.total.toLocaleString('en-IN')}`);
  });

  await mongoose.disconnect();
}
run();
