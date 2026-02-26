/**
 * Debug Balance Sheet FY 2024-25 mismatch
 * Compares with FY 2023-24 and traces all issues
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');
  const v = mongoose.connection.collection('tally_manual_vouchers');

  console.log('═'.repeat(70));
  console.log('  FY 2023-24 BALANCE SHEET (Reference - should be correct)');
  console.log('═'.repeat(70));

  // Get 23-24 BS entries
  const entries2324 = await b.find({ financialYear: '2023-24', category: { $in: ['asset','liability'] } })
    .sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();
  
  let a23 = 0, l23cr = 0, l23dr = 0;
  for (const e of entries2324) {
    const amt = Math.abs(e.amount || 0);
    const drCr = e.drCr || '?';
    console.log(`  ${e.category.padEnd(10)} | ${(e.parentGroup||'').padEnd(25)} | ${(e.ledgerName||'').padEnd(40)} | ${drCr.padEnd(3)} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (e.category === 'asset') a23 += amt;
    if (e.category === 'liability') { if (drCr === 'Cr') l23cr += amt; else l23dr += amt; }
  }
  console.log(`\n  23-24 Assets: ${a23}`);
  console.log(`  23-24 Liabilities Net: ${l23cr - l23dr}`);
  console.log(`  23-24 Difference: ${a23 - (l23cr - l23dr)}`);

  // 23-24 P&L
  const pl2324 = await b.find({ financialYear: '2023-24', category: { $in: ['income','expense'] } }).toArray();
  let inc23 = 0, exp23 = 0;
  console.log('\n  FY 2023-24 P&L:');
  for (const e of pl2324) {
    const amt = Math.abs(e.amount || 0);
    console.log(`    ${e.category.padEnd(10)} | ${(e.ledgerName||'').padEnd(40)} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (e.category === 'income') inc23 += amt;
    if (e.category === 'expense') exp23 += amt;
  }
  console.log(`  23-24 Income: ${inc23}, Expense: ${exp23}, Net: ${inc23 - exp23}`);

  // P&L Account entries
  const plAccount2324 = await b.findOne({ financialYear: '2023-24', ledgerName: /Profit.*Loss|P.*L.*Account/i });
  console.log(`\n  23-24 P&L A/c entry: ${plAccount2324 ? `${plAccount2324.ledgerName} = Rs.${plAccount2324.amount} (${plAccount2324.drCr})` : 'NOT FOUND'}`);

  console.log('\n' + '═'.repeat(70));
  console.log('  FY 2024-25 BALANCE SHEET (HAS ISSUES)');
  console.log('═'.repeat(70));

  // Get ALL 24-25 entries
  const all2425 = await b.find({ financialYear: '2024-25' }).sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();
  
  let a25Dr = 0, a25Cr = 0;
  let l25Cr = 0, l25Dr = 0;
  let i25Cr = 0, i25Dr = 0;
  let e25Dr = 0, e25Cr = 0;

  console.log('\n  ASSETS:');
  for (const e of all2425.filter(x => x.category === 'asset')) {
    const amt = Math.abs(e.amount || 0);
    console.log(`    ${(e.parentGroup||'').padEnd(25)} | ${(e.ledgerName||'').padEnd(40)} | ${(e.drCr||'?').padEnd(3)} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (e.drCr === 'Dr') a25Dr += amt; else a25Cr += amt;
  }
  console.log(`    TOTAL ASSETS: Dr=${a25Dr} Cr=${a25Cr} Net=${a25Dr - a25Cr}`);

  console.log('\n  LIABILITIES:');
  for (const e of all2425.filter(x => x.category === 'liability')) {
    const amt = Math.abs(e.amount || 0);
    console.log(`    ${(e.parentGroup||'').padEnd(25)} | ${(e.ledgerName||'').padEnd(40)} | ${(e.drCr||'?').padEnd(3)} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (e.drCr === 'Cr') l25Cr += amt; else l25Dr += amt;
  }
  console.log(`    TOTAL LIABILITIES: Cr=${l25Cr} Dr=${l25Dr} Net=${l25Cr - l25Dr}`);

  console.log('\n  INCOME:');
  for (const e of all2425.filter(x => x.category === 'income')) {
    const amt = Math.abs(e.amount || 0);
    console.log(`    ${(e.parentGroup||'').padEnd(25)} | ${(e.ledgerName||'').padEnd(40)} | ${(e.drCr||'?').padEnd(3)} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (e.drCr === 'Cr') i25Cr += amt; else i25Dr += amt;
  }
  console.log(`    TOTAL INCOME: Cr=${i25Cr} Net=${i25Cr - i25Dr}`);

  console.log('\n  EXPENSES:');
  for (const e of all2425.filter(x => x.category === 'expense')) {
    const amt = Math.abs(e.amount || 0);
    console.log(`    ${(e.parentGroup||'').padEnd(25)} | ${(e.ledgerName||'').padEnd(40)} | ${(e.drCr||'?').padEnd(3)} | Rs.${amt.toLocaleString('en-IN').padStart(12)}`);
    if (e.drCr === 'Dr') e25Dr += amt; else e25Cr += amt;
  }
  console.log(`    TOTAL EXPENSES: Dr=${e25Dr} Net=${e25Dr - e25Cr}`);

  const netAssets = a25Dr - a25Cr;
  const netLiab = l25Cr - l25Dr;
  const netIncome = i25Cr - i25Dr;
  const netExpense = e25Dr - e25Cr;
  const currentPL = netIncome - netExpense;

  console.log('\n' + '─'.repeat(70));
  console.log('  ANALYSIS:');
  console.log('─'.repeat(70));
  console.log(`  Assets (net):            Rs.${netAssets.toLocaleString('en-IN')}`);
  console.log(`  Liabilities (net):       Rs.${netLiab.toLocaleString('en-IN')}`);
  console.log(`  Current Year P&L:        Rs.${currentPL.toLocaleString('en-IN')} (Income ${netIncome} - Expense ${netExpense})`);
  console.log(`  BS Equation: A = L + P`);
  console.log(`    ${netAssets} = ${netLiab} + ${currentPL}`);
  console.log(`    ${netAssets} = ${netLiab + currentPL}`);
  console.log(`    Gap: ${netAssets - (netLiab + currentPL)}`);

  // P&L Account under Reserves — this is the CUMULATIVE P&L in the Balance Sheet
  const plEntry = all2425.find(e => /Profit.*Loss|P.*L.*Account/i.test(e.ledgerName));
  const divEntry = all2425.find(e => /Dividend/i.test(e.ledgerName));
  console.log(`\n  KEY ENTRY: "Profit & Loss Account" = Rs.${plEntry?.amount || 0} (${plEntry?.drCr || '?'})`);
  console.log(`  KEY ENTRY: "Dividends Paid" = Rs.${divEntry?.amount || 0} (${divEntry?.drCr || '?'})`);

  console.log('\n  IMPORTANT: The P&L Account under Reserves & Surplus should be the');
  console.log('  CLOSING P&L = Opening P&L (from 23-24) + Current Year Profit/Loss');
  const openingPL = plAccount2324 ? plAccount2324.amount : 0;
  const openingPLDrCr = plAccount2324 ? plAccount2324.drCr : '?';
  console.log(`  Opening P&L from 23-24: Rs.${openingPL} (${openingPLDrCr})`);
  console.log(`  Current Year P&L from income/expense entries: Rs.${currentPL}`);
  
  if (openingPLDrCr === 'Dr') {
    // Opening loss
    const expectedClosing = openingPL + Math.abs(currentPL);
    console.log(`  Expected Closing P&L: Rs.${expectedClosing} Dr (Opening Loss ${openingPL} + Current Loss ${Math.abs(currentPL)})`);
    console.log(`  Actual P&L Account entry: Rs.${plEntry?.amount || 0} (${plEntry?.drCr || '?'})`);
    const diff = (plEntry?.amount || 0) - expectedClosing;
    console.log(`  DISCREPANCY: Rs.${diff}`);
  }

  // Check: What if we remove the current year loss that's double counted?
  console.log('\n' + '─'.repeat(70));
  console.log('  POSSIBLE ISSUES:');
  console.log('─'.repeat(70));
  
  // Issue 1: Is current year P&L already embedded in P&L Account?
  console.log('  1. Is current year P&L already embedded in P&L Account (Rs.4,03,338)?');
  console.log(`     If P&L Account already includes current year loss, then`);
  console.log(`     income/expense entries are DOUBLE-COUNTING the loss.`);
  
  // Issue 2: Check if depreciation amounts make sense
  const depEntries = all2425.filter(e => /depreciation/i.test(e.ledgerName));
  let totalDep = 0;
  for (const d of depEntries) totalDep += d.amount;
  console.log(`\n  2. Depreciation total: Rs.${totalDep.toLocaleString('en-IN')}`);
  for (const d of depEntries) {
    console.log(`     ${d.ledgerName}: Rs.${d.amount.toLocaleString('en-IN')}`);
  }

  // Issue 3: Misc expenses
  const miscEntry = all2425.find(e => /Miscellaneous/i.test(e.ledgerName));
  console.log(`\n  3. Miscellaneous Expenses: Rs.${miscEntry?.amount?.toLocaleString('en-IN') || 0}`);
  console.log(`     This is very high — may contain items that should be categorized elsewhere.`);

  // Issue 4: Check Sundry Advances
  console.log(`\n  4. Sundry Advances (Received) under Current Liabilities: Rs.3,25,000`);
  console.log(`     This is large — verify if this is correct or should be different.`);

  // Compare with voucher totals
  console.log('\n' + '─'.repeat(70));
  console.log('  VOUCHER vs BALANCE COMPARISON:');
  console.log('─'.repeat(70));
  
  const receiptAgg = await v.aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Receipt' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]).toArray();
  const paymentAgg = await v.aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Payment' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]).toArray();

  const rTotal = receiptAgg[0]?.total || 0;
  const pTotal = paymentAgg[0]?.total || 0;
  
  console.log(`  Voucher Receipts: Rs.${Math.round(rTotal).toLocaleString('en-IN')}`);
  console.log(`  Voucher Payments: Rs.${Math.round(pTotal).toLocaleString('en-IN')}`);
  console.log(`  Net Cash P&L:     Rs.${Math.round(rTotal - pTotal).toLocaleString('en-IN')}`);
  console.log(`  Balance Income:   Rs.${netIncome.toLocaleString('en-IN')}`);
  console.log(`  Balance Expenses: Rs.${netExpense.toLocaleString('en-IN')}`);
  console.log(`  Receipt - Income diff: Rs.${Math.round(rTotal - netIncome).toLocaleString('en-IN')} (capital receipts not in P&L)`);

  // Check what categories the Receipt and Payment vouchers have
  console.log('\n' + '─'.repeat(70));
  console.log('  EXPECTED LOSS CALCULATION:');
  console.log('─'.repeat(70));
  console.log(`  User says loss should be ~Rs.63,000`);
  console.log(`  Current P&L shows loss of Rs.${Math.abs(currentPL).toLocaleString('en-IN')}`);
  console.log(`  Difference: Rs.${Math.abs(Math.abs(currentPL) - 63000).toLocaleString('en-IN')}`);
  
  // If loss should be 63000, what needs to change?
  const idealLoss = 63000;
  const excessLoss = Math.abs(currentPL) - idealLoss;
  console.log(`\n  To get loss of ~Rs.63,000 from current Rs.${Math.abs(currentPL).toLocaleString('en-IN')}:`);
  console.log(`    Need to REDUCE expenses by Rs.${excessLoss.toLocaleString('en-IN')}`);
  console.log(`    OR INCREASE income by Rs.${excessLoss.toLocaleString('en-IN')}`);
  console.log(`    OR some combination`);
  
  // Depreciation = 207475 - without depreciation loss = 358146 - 207475 = 150671
  console.log(`\n  Without depreciation (Rs.${totalDep.toLocaleString('en-IN')}): Loss = Rs.${Math.abs(currentPL - totalDep).toLocaleString('en-IN')}`);
  // Cash basis P&L from vouchers
  console.log(`  Cash basis P&L from vouchers: PROFIT of Rs.${Math.round(rTotal - pTotal).toLocaleString('en-IN')}`);

  console.log('\n' + '═'.repeat(70));
  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
