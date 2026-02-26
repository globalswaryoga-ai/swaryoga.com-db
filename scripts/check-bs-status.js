/**
 * Quick BS status check for FY 2024-25
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');

  const entries = await b.find({ financialYear: '2024-25' }).sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();

  let a = { dr: 0, cr: 0 }, l = { dr: 0, cr: 0 }, i = { dr: 0, cr: 0 }, e = { dr: 0, cr: 0 };

  console.log('=== FY 2024-25 CURRENT STATUS ===\n');

  console.log('── ASSETS ──');
  for (const x of entries.filter(x => x.category === 'asset')) {
    const amt = Math.abs(x.amount);
    console.log(`  ${(x.parentGroup||'').padEnd(25)} | ${x.ledgerName.padEnd(40)} | ${x.drCr} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (x.drCr === 'Dr') a.dr += amt; else a.cr += amt;
  }
  console.log(`  TOTAL ASSETS: Rs.${(a.dr - a.cr).toLocaleString('en-IN')}\n`);

  console.log('── LIABILITIES ──');
  for (const x of entries.filter(x => x.category === 'liability')) {
    const amt = Math.abs(x.amount);
    console.log(`  ${(x.parentGroup||'').padEnd(25)} | ${x.ledgerName.padEnd(40)} | ${x.drCr} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (x.drCr === 'Cr') l.cr += amt; else l.dr += amt;
  }
  console.log(`  TOTAL LIABILITIES: Rs.${(l.cr - l.dr).toLocaleString('en-IN')}\n`);

  console.log('── INCOME ──');
  for (const x of entries.filter(x => x.category === 'income')) {
    const amt = Math.abs(x.amount);
    console.log(`  ${(x.parentGroup||'').padEnd(25)} | ${x.ledgerName.padEnd(40)} | ${x.drCr} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (x.drCr === 'Cr') i.cr += amt; else i.dr += amt;
  }
  console.log(`  TOTAL INCOME: Rs.${(i.cr - i.dr).toLocaleString('en-IN')}\n`);

  console.log('── EXPENSES ──');
  for (const x of entries.filter(x => x.category === 'expense')) {
    const amt = Math.abs(x.amount);
    console.log(`  ${(x.parentGroup||'').padEnd(25)} | ${x.ledgerName.padEnd(40)} | ${x.drCr} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (x.drCr === 'Dr') e.dr += amt; else e.cr += amt;
  }
  console.log(`  TOTAL EXPENSES: Rs.${(e.dr - e.cr).toLocaleString('en-IN')}\n`);

  const netAssets = a.dr - a.cr;
  const netLiab = l.cr - l.dr;
  const netIncome = i.cr - i.dr;
  const netExpense = e.dr - e.cr;
  const netPL = netIncome - netExpense;

  console.log('═'.repeat(60));
  console.log('  SUMMARY:');
  console.log('  Assets:       Rs.' + netAssets.toLocaleString('en-IN'));
  console.log('  Liabilities:  Rs.' + netLiab.toLocaleString('en-IN'));
  console.log('  Income:       Rs.' + netIncome.toLocaleString('en-IN'));
  console.log('  Expenses:     Rs.' + netExpense.toLocaleString('en-IN'));
  console.log('  Net P&L:      Rs.' + netPL.toLocaleString('en-IN') + (netPL < 0 ? ' (LOSS)' : ' (PROFIT)'));
  console.log('');
  console.log('  BS: Assets = Liabilities + P&L');
  console.log('  ' + netAssets + ' = ' + netLiab + ' + ' + netPL);
  console.log('  ' + netAssets + ' = ' + (netLiab + netPL));
  console.log('  GAP: Rs.' + (netAssets - netLiab - netPL).toLocaleString('en-IN'));
  console.log('═'.repeat(60));

  // Bank statement says total deposits = 12,91,896.72
  // Our income in DB = Course Fees only = 3,43,216
  // Investment = 8,61,008 (in Share Capital)
  // Other deposits from bank (course income not in DB):
  //   - Weight Loss (4000 + 5000), Nepal (10000 + 50000 = 60000 → fees receivable)
  //   - Swar Yoga typos (4999 + 2500 + 1000 = 8499)
  //   - Basic Swar Yoga (9.94 + 47.87 = 57.81)
  //   - Cash to Bank 85000 (contra, not income)
  //   - Light Bill Refund 4450
  //   - Bank Interest (~25)
  //   - Refund 72.52
  console.log('\n── INCOME ANALYSIS ──');
  console.log('  Course Fees in DB:       Rs.3,43,216');
  console.log('  Nepal dues collected:    Rs.60,000 (reduced Fees Receivable, NOT P&L)');
  console.log('  Missing course income:');
  console.log('    Weight Loss (May):     Rs.4,000');
  console.log('    Swar Yoga (Nov Geeta): Rs.4,999');
  console.log('    Swar Yoga (Nov Preeti):Rs.2,500');
  console.log('    Swar Yoga (Nov Shekhar):Rs.1,000');
  console.log('    Weight Loss (Nov):     Rs.5,000');
  console.log('    Basic Swar (Sep+Nov):  Rs.57.81');
  console.log('    TOTAL MISSING COURSE:  Rs.17,556.81');
  console.log('');
  console.log('  Light Bill Refund:       Rs.4,450 (other income)');
  console.log('  Bank Interest:           Rs.~25 (other income)');
  console.log('  Cash to Bank:            Rs.85,000 (CONTRA - NOT income)');
  console.log('  UPI Refund:              Rs.72.52 (other income)');
  console.log('');
  console.log('  CORRECT Total Income = Rs.3,43,216 + Rs.17,557 + Rs.4,548 = Rs.~3,65,321');
  console.log('  Currently showing:    Rs.' + netIncome.toLocaleString('en-IN'));
  console.log('  Missing income:       Rs.~22,105');

  await mongoose.disconnect();
}
run();
