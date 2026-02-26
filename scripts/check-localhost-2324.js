// Check localhost FY 2023-24 all reports
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function fetchAPI(path, token) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000${path}`;
    const req = http.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000);
  });
}

async function main() {
  // Create admin token
  const token = jwt.sign({ userId: 'test-admin', isAdmin: true, email: 'admin@test.com' }, JWT_SECRET, { expiresIn: '1h' });

  console.log('=== FY 2023-24 LOCALHOST CHECK ===\n');

  // 1. Summary
  const summaryRaw = await fetchAPI('/api/tally/reports?type=summary&fy=2023-24', token);
  const summary = summaryRaw.data || summaryRaw;
  console.log('── DASHBOARD SUMMARY ──');
  if (summary.error || summaryRaw.error) { console.log('ERROR:', summary.error || summaryRaw.error); return; }
  console.log('  Ledgers:', summary.ledgerCount);
  console.log('  Vouchers:', summary.voucherCount);
  console.log('  Is Closed:', summary.isClosed);
  console.log('  Opening Balance:', summary.openingBalance);
  console.log('  Closing Balance:', summary.closingBalance);
  console.log('  Cash in Hand:', summary.cashInHand);
  console.log('  P&L: Income=' + summary.profitLoss?.totalIncome + ' Expense=' + summary.profitLoss?.totalExpense + ' Net=' + summary.profitLoss?.netProfit);
  if (summary.balanceSheet) {
    console.log('  BS: Assets=' + summary.balanceSheet.totalAssets + ' L+C=' + summary.balanceSheet.liabilitiesPlusCapital + ' Diff=' + summary.balanceSheet.difference + ' Balanced=' + summary.balanceSheet.isBalanced);
  }

  // 2. P&L
  const plRaw = await fetchAPI('/api/tally/reports?type=profit-loss&fy=2023-24', token);
  const pl = plRaw.data || plRaw;
  console.log('\n── PROFIT & LOSS ──');
  if (pl.income) {
    console.log('  INCOME (' + pl.income.length + ' items):');
    pl.income.forEach(i => console.log('    ' + i.ledgerName.padEnd(40) + ' Rs ' + i.amount.toFixed(2)));
    console.log('  Total Income: Rs ' + pl.totalIncome.toFixed(2));
  }
  if (pl.expenses) {
    console.log('  EXPENSES (' + pl.expenses.length + ' items):');
    pl.expenses.forEach(e => console.log('    ' + e.ledgerName.padEnd(40) + ' Rs ' + e.amount.toFixed(2)));
    console.log('  Total Expenses: Rs ' + pl.totalExpense.toFixed(2));
  }
  console.log('  Net: Rs ' + pl.netProfit?.toFixed(2) + ' (' + (pl.isProfit ? 'Profit' : 'Loss') + ')');

  // 3. Balance Sheet
  const bsRaw = await fetchAPI('/api/tally/reports?type=balance-sheet&fy=2023-24', token);
  const bs = bsRaw.data || bsRaw;
  console.log('\n── BALANCE SHEET ──');
  if (bs.assets) {
    console.log('  ASSETS (' + bs.assets.length + ' items):');
    bs.assets.forEach(a => console.log('    ' + a.ledgerName.padEnd(40) + ' Rs ' + a.amount.toFixed(2)));
    console.log('  Total Assets: Rs ' + bs.totalAssets?.toFixed(2));
  }
  if (bs.liabilities) {
    console.log('  LIABILITIES (' + bs.liabilities.length + ' items):');
    bs.liabilities.forEach(l => console.log('    ' + l.ledgerName.padEnd(40) + ' Rs ' + l.amount.toFixed(2)));
    console.log('  Total Liabilities: Rs ' + bs.totalLiabilities?.toFixed(2));
  }
  if (bs.capital) {
    console.log('  CAPITAL (' + bs.capital.length + ' items):');
    bs.capital.forEach(c => console.log('    ' + c.ledgerName.padEnd(40) + ' Rs ' + c.amount.toFixed(2)));
    console.log('  Total Capital: Rs ' + bs.totalCapital?.toFixed(2));
    console.log('  Capital Adjusted (with P&L): Rs ' + bs.capitalAdjusted?.toFixed(2));
  }
  console.log('  Liab + Capital: Rs ' + bs.liabilitiesPlusCapital?.toFixed(2));
  console.log('  Difference: Rs ' + bs.difference?.toFixed(2));
  console.log('  BALANCED: ' + (bs.difference === 0 ? 'YES' : 'NO'));

  // 4. Trial Balance
  const tbRaw = await fetchAPI('/api/tally/reports?type=trial-balance&fy=2023-24', token);
  const tb = tbRaw.data || tbRaw;
  console.log('\n── TRIAL BALANCE ──');
  console.log('  Total Debit: Rs ' + tb.totalDebit?.toFixed(2));
  console.log('  Total Credit: Rs ' + tb.totalCredit?.toFixed(2));
  console.log('  Difference: Rs ' + tb.difference?.toFixed(2));
  console.log('  BALANCED: ' + (tb.difference === 0 ? 'YES' : 'NO'));

  console.log('\n=== CA REPORT MATCH ===');
  const checks = [
    ['Revenue (excl DT)', (pl.totalIncome || 0) - 30493, 723722],
    ['Total Income', pl.totalIncome, 754215],
    ['Total Expenses', pl.totalExpense, 803178],
    ['Net Loss', Math.abs(pl.netProfit || 0), 48963],
    ['Total Assets (BS)', bs.totalAssets, 866815],
    ['BS Difference', bs.difference, 0],
    ['TB Difference', tb.difference, 0],
  ];
  let allPass = true;
  checks.forEach(([label, actual, expected]) => {
    const pass = Math.abs(actual - expected) < 1;
    if (!pass) allPass = false;
    console.log('  ' + String(label).padEnd(25) + (pass ? 'PASS' : 'FAIL') + '  (actual: ' + actual + ', expected: ' + expected + ')');
  });
  console.log('\n  ALL CHECKS: ' + (allPass ? 'PASSED' : 'SOME FAILED'));
}

main().catch(e => { console.error(e); process.exit(1); });
