#!/usr/bin/env node
/**
 * Analyze FY 2024-25 expenses:
 *   - DB payment vouchers vs bank withdrawals
 *   - Category-wise comparison
 *   - Find overstatement or missing items
 */
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const MONGO_URI = process.env.MONGODB_URI_MAIN;
const DB = 'swaryoga_admin_crm';
const EXCEL = path.resolve(
  process.env.HOME,
  'Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx'
);

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB);

  /* ─── 1. DB Payment Vouchers ─── */
  const payments = await db
    .collection('tally_manual_vouchers')
    .find({ fy: '2024-25', type: 'Payment' })
    .sort({ date: 1 })
    .toArray();

  console.log('═'.repeat(60));
  console.log('  EXPENSE ANALYSIS — FY 2024-25');
  console.log('═'.repeat(60));

  // Group by ledger
  const byLedger = {};
  for (const p of payments) {
    const ledger = p.ledger || p.narration || 'Unknown';
    if (!byLedger[ledger]) byLedger[ledger] = { count: 0, total: 0, items: [] };
    byLedger[ledger].count++;
    byLedger[ledger].total += p.amount;
    byLedger[ledger].items.push(p);
  }

  console.log('\n── DB PAYMENT VOUCHERS BY LEDGER ──');
  const sorted = Object.entries(byLedger).sort((a, b) => b[1].total - a[1].total);
  let dbTotal = 0;
  for (const [ledger, data] of sorted) {
    console.log(`  ${ledger.padEnd(35)} ${data.count.toString().padStart(3)} entries  Rs.${data.total.toFixed(2).padStart(12)}`);
    dbTotal += data.total;
  }
  console.log(`  ${'TOTAL'.padEnd(35)} ${payments.length.toString().padStart(3)} entries  Rs.${dbTotal.toFixed(2).padStart(12)}`);

  /* ─── 2. DB Balance Entry Expenses ─── */
  const balances = await db
    .collection('tally_manual_balances')
    .find({ fy: '2024-25' })
    .toArray();

  const expenseEntries = balances.filter(b => b.bsCategory === 'Expenses');
  console.log('\n── DB BALANCE ENTRY EXPENSES ──');
  let balExpTotal = 0;
  for (const e of expenseEntries) {
    const amt = e.drAmount || 0;
    console.log(`  ${(e.ledgerName || '').padEnd(35)} Dr Rs.${amt.toFixed(2).padStart(12)}`);
    balExpTotal += amt;
  }
  console.log(`  ${'TOTAL'.padEnd(35)}    Rs.${balExpTotal.toFixed(2).padStart(12)}`);

  /* ─── 3. Compare voucher totals vs balance totals ─── */
  console.log('\n── VOUCHER vs BALANCE COMPARISON ──');
  // Group vouchers by what maps to each balance entry
  const voucherByCategory = {};
  for (const p of payments) {
    const cat = p.ledger || 'Unknown';
    if (!voucherByCategory[cat]) voucherByCategory[cat] = 0;
    voucherByCategory[cat] += p.amount;
  }

  for (const e of expenseEntries) {
    const name = e.ledgerName || '';
    const balAmt = e.drAmount || 0;
    // Try to find matching voucher total
    const vAmt = voucherByCategory[name] || 0;
    const diff = balAmt - vAmt;
    const flag = Math.abs(diff) > 1 ? ' ← MISMATCH' : ' ✓';
    console.log(`  ${name.padEnd(35)} Bal: ${balAmt.toFixed(0).padStart(8)}  Vouchers: ${vAmt.toFixed(0).padStart(8)}  Diff: ${diff.toFixed(0).padStart(8)}${flag}`);
  }

  /* ─── 4. Bank Withdrawals ─── */
  const wb = XLSX.readFile(EXCEL);
  const ws = wb.Sheets['Sheet1'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let bankWithdrawals = 0;
  let bankWdCount = 0;
  const wdByMonth = {};
  const wdCategories = {};

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;

    const serial = Number(r[0]);
    if (isNaN(serial)) continue;

    const narration = String(r[2] || '');
    const drStr = String(r[4] || '');
    const crStr = String(r[5] || '');

    // Extract Dr (withdrawal) amounts
    let drAmt = 0;
    const drMatch = drStr.match(/([\d,.]+)\(Dr\)/i);
    if (drMatch) {
      drAmt = parseFloat(drMatch[1].replace(/,/g, ''));
    }

    if (drAmt > 0) {
      bankWithdrawals += drAmt;
      bankWdCount++;

      // Month
      const month = String(r[1] || '').toUpperCase();
      if (!wdByMonth[month]) wdByMonth[month] = { count: 0, total: 0 };
      wdByMonth[month].count++;
      wdByMonth[month].total += drAmt;

      // Categorize
      const nar = narration.toUpperCase();
      let cat = 'Other';
      if (/SALARY|WAGES|STAF|EMP/.test(nar)) cat = 'Salary/Staff';
      else if (/RENT/.test(nar)) cat = 'Rent';
      else if (/TRAVEL|TRAVALL|PETROL|FUEL|DIESEL/.test(nar)) cat = 'Travel';
      else if (/ELECTRIC|LIGHT|BILL|MAHA.*ELEC|MSEDCL/.test(nar)) cat = 'Electricity';
      else if (/GST|TAX|TDS|INCOME TAX|IT RETURN/.test(nar)) cat = 'Tax/GST';
      else if (/ADVERTI|MARKETING|META|FACEBOOK|GOOGLE|INSTA/.test(nar)) cat = 'Marketing';
      else if (/PHONE|MOBILE|AIRTEL|JIO|VI\s|IDEA|VODAFONE/.test(nar)) cat = 'Phone/Internet';
      else if (/PRINTING|PRINT|STATIONARY|STATIONERY/.test(nar)) cat = 'Printing';
      else if (/INSURANCE|LIC|POLICY/.test(nar)) cat = 'Insurance';
      else if (/DIVIDEND|RETURN.*INVEST|INVEST.*RETURN/.test(nar)) cat = 'Dividends';
      else if (/FOOD|TIFFIN|MEAL|HOTEL|RESTAURANT/.test(nar)) cat = 'Food';
      else if (/AMAZON|FLIPKART|ONLINE|MYNTRA/.test(nar)) cat = 'Online Purchase';
      else if (/CASH|ATM|WITHDRAWAL/.test(nar)) cat = 'Cash Withdrawal';
      else if (/UPI/.test(nar)) cat = 'UPI Payment';
      else if (/NEFT|RTGS|IMPS/.test(nar)) cat = 'Bank Transfer';
      else if (/SWARYOGA|SWAR YOGA/.test(nar)) cat = 'Swar Yoga Related';

      if (!wdCategories[cat]) wdCategories[cat] = { count: 0, total: 0, items: [] };
      wdCategories[cat].count++;
      wdCategories[cat].total += drAmt;
      if (wdCategories[cat].items.length < 5) {
        wdCategories[cat].items.push({ amt: drAmt, nar: narration.substring(0, 60) });
      }
    }
  }

  console.log('\n── BANK WITHDRAWALS BY MONTH ──');
  let bankWdMonthTotal = 0;
  const monthOrder = ['APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER','JANUARY','FEBRUARY','MARCH'];
  for (const m of monthOrder) {
    if (wdByMonth[m]) {
      console.log(`  ${m.padEnd(12)} ${wdByMonth[m].count.toString().padStart(3)} txns  Rs.${wdByMonth[m].total.toFixed(2).padStart(12)}`);
      bankWdMonthTotal += wdByMonth[m].total;
    }
  }
  console.log(`  ${'TOTAL'.padEnd(12)} ${bankWdCount.toString().padStart(3)} txns  Rs.${bankWdMonthTotal.toFixed(2).padStart(12)}`);

  console.log('\n── BANK WITHDRAWALS BY CATEGORY ──');
  const sortedCat = Object.entries(wdCategories).sort((a, b) => b[1].total - a[1].total);
  for (const [cat, data] of sortedCat) {
    console.log(`  ${cat.padEnd(20)} ${data.count.toString().padStart(3)} txns  Rs.${data.total.toFixed(2).padStart(12)}`);
    for (const item of data.items.slice(0, 3)) {
      console.log(`      ${item.nar.padEnd(50)} Rs.${item.amt.toFixed(2).padStart(10)}`);
    }
  }

  /* ─── 5. Grand Comparison ─── */
  console.log('\n── GRAND COMPARISON ──');
  console.log(`  DB Payment Vouchers Total:     Rs.${dbTotal.toFixed(2).padStart(12)}`);
  console.log(`  DB Balance Entry Expenses:     Rs.${balExpTotal.toFixed(2).padStart(12)}`);
  console.log(`  Bank Withdrawals Total:        Rs.${bankWithdrawals.toFixed(2).padStart(12)}`);
  console.log(`  DB Vouchers vs Bank:           Rs.${(dbTotal - bankWithdrawals).toFixed(2).padStart(12)} (${dbTotal > bankWithdrawals ? 'DB higher' : 'Bank higher'})`);
  console.log(`  DB Balance vs Bank:            Rs.${(balExpTotal - bankWithdrawals).toFixed(2).padStart(12)} (${balExpTotal > bankWithdrawals ? 'DB higher' : 'Bank higher'})`);

  // Cash expenses (not through bank)
  const cashExpenses = dbTotal - bankWithdrawals;
  if (cashExpenses > 0) {
    console.log(`\n  ⚠️  DB has Rs.${cashExpenses.toFixed(2)} MORE than bank — these are presumably cash expenses.`);
    console.log(`     But bank shows Cash Withdrawals of Rs.${(wdCategories['Cash Withdrawal'] || {total:0}).total.toFixed(2)}`);
    console.log(`     Cash in Hand (Opening): Rs.291886    Cash in Hand (Closing): Rs.90000`);
    console.log(`     Cash used from hand:    Rs.${(291886 - 90000).toFixed(2)}`);
    console.log(`     Cash withdrawn from bank + cash on hand used = Rs.${((wdCategories['Cash Withdrawal'] || {total:0}).total + 201886).toFixed(2)}`);
  }

  /* ─── 6. Check contra entries ─── */
  const contras = await db
    .collection('tally_manual_vouchers')
    .find({ fy: '2024-25', type: 'Contra' })
    .toArray();
  
  console.log('\n── CONTRA ENTRIES ──');
  let contraTotal = 0;
  for (const c of contras) {
    console.log(`  ${new Date(c.date).toLocaleDateString().padEnd(12)} ${(c.narration || '').substring(0, 50).padEnd(50)} Rs.${c.amount.toFixed(2).padStart(10)}`);
    contraTotal += c.amount;
  }
  console.log(`  Total Contra: Rs.${contraTotal.toFixed(2)}`);

  /* ─── 7. Final Analysis ─── */
  console.log('\n── KEY FINDINGS ──');
  const targetLoss = 63000;
  const currentLoss = 276067;
  const gap = currentLoss - targetLoss;
  console.log(`  Current Loss:     Rs.${currentLoss}`);
  console.log(`  Target Loss:      Rs.~${targetLoss}`);
  console.log(`  Gap to fix:       Rs.${gap} (reduce expenses or increase income by this)`);
  
  // What if Fees Receivable was included in assets?
  console.log(`\n  If Fees Receivable (Rs.51,769) is added to assets:`);
  console.log(`    This is a BS item, not P&L — won't change the loss.`);
  
  // Check if dividends should reduce expenses
  const divExp = expenseEntries.find(e => e.ledgerName && e.ledgerName.includes('Dividend'));
  if (divExp) {
    console.log(`\n  Dividends Paid: Rs.${divExp.drAmount} — this is NOT an expense in P&L.`);
    console.log(`    It should be a deduction from Preference Share Capital (liability).`);
    console.log(`    Moving this reduces loss by Rs.${divExp.drAmount}`);
  }

  await client.close();
}

main().catch(console.error);
