require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  const fy = '2024-25';
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  FULL ACCOUNT AUDIT — FY ${fy}`);
  console.log(`${'='.repeat(70)}\n`);

  // ── 1. Vouchers ──
  const vouchers = await db.collection('tally_manual_vouchers').find({ financialYear: fy }).sort({ date: 1 }).toArray();
  
  const byType = {};
  const byTypeTotal = {};
  for (const v of vouchers) {
    byType[v.voucherType] = (byType[v.voucherType] || 0) + 1;
    byTypeTotal[v.voucherType] = (byTypeTotal[v.voucherType] || 0) + v.amount;
  }

  console.log('── VOUCHER SUMMARY ──');
  for (const t of Object.keys(byType).sort()) {
    console.log(`  ${t.padEnd(12)} : ${String(byType[t]).padStart(4)} vouchers | ₹${byTypeTotal[t].toLocaleString('en-IN')}`);
  }
  console.log(`  ${'TOTAL'.padEnd(12)} : ${String(vouchers.length).padStart(4)} vouchers`);

  // ── 2. Receipt Vouchers Detail ──
  console.log('\n── RECEIPT VOUCHERS (Income) ──');
  const receipts = vouchers.filter(v => v.voucherType === 'Receipt').sort((a,b) => a.date.localeCompare(b.date));
  let rTotal = 0;
  receipts.forEach((v, i) => {
    rTotal += v.amount;
    console.log(`  ${String(i+1).padStart(3)}. ${v.date} | ${v.partyName.padEnd(35).slice(0,35)} | ${String(v.amount).padStart(10)} | ${v.paymentMode || '-'} | ${(v.narration || '').slice(0,40)}`);
  });
  console.log(`  ${''.padEnd(3)}  ${''.padEnd(10)}   ${'Total Receipts'.padEnd(35)} | ${String(rTotal).padStart(10)}`);

  // ── 3. Payment Vouchers Detail ──
  console.log('\n── PAYMENT VOUCHERS (Expenses) ──');
  const payments = vouchers.filter(v => v.voucherType === 'Payment').sort((a,b) => a.date.localeCompare(b.date));
  let pTotal = 0;
  payments.forEach((v, i) => {
    pTotal += v.amount;
    console.log(`  ${String(i+1).padStart(3)}. ${v.date} | ${v.partyName.padEnd(35).slice(0,35)} | ${String(v.amount).padStart(10)} | ${v.paymentMode || '-'} | ${(v.narration || '').slice(0,40)}`);
  });
  console.log(`  ${''.padEnd(3)}  ${''.padEnd(10)}   ${'Total Payments'.padEnd(35)} | ${String(pTotal).padStart(10)}`);

  // ── 4. Journal & Contra Vouchers ──
  const journals = vouchers.filter(v => v.voucherType === 'Journal');
  const contras = vouchers.filter(v => v.voucherType === 'Contra');
  if (journals.length > 0) {
    console.log('\n── JOURNAL VOUCHERS ──');
    journals.forEach((v, i) => {
      console.log(`  ${String(i+1).padStart(3)}. ${v.date} | ${v.partyName.padEnd(35).slice(0,35)} | ${String(v.amount).padStart(10)} | ${(v.narration || '').slice(0,40)}`);
    });
    console.log(`  Total: ₹${journals.reduce((s,v) => s+v.amount, 0).toLocaleString('en-IN')}`);
  }
  if (contras.length > 0) {
    console.log('\n── CONTRA VOUCHERS ──');
    contras.forEach((v, i) => {
      console.log(`  ${String(i+1).padStart(3)}. ${v.date} | ${v.partyName.padEnd(35).slice(0,35)} | ${String(v.amount).padStart(10)} | ${(v.narration || '').slice(0,40)}`);
    });
    console.log(`  Total: ₹${contras.reduce((s,v) => s+v.amount, 0).toLocaleString('en-IN')}`);
  }

  // ── 5. Manual Balances (Income/Expense/Assets/Liabilities) ──
  const balances = await db.collection('tally_manual_balances').find({ financialYear: fy }).sort({ category: 1, ledgerName: 1 }).toArray();
  
  const categories = {};
  for (const b of balances) {
    if (!categories[b.category]) categories[b.category] = [];
    categories[b.category].push(b);
  }

  console.log('\n── MANUAL BALANCES BY CATEGORY ──');
  for (const cat of ['income', 'expense', 'assets', 'liabilities']) {
    const entries = categories[cat] || [];
    if (entries.length === 0) continue;
    const total = entries.reduce((s, e) => {
      if (cat === 'liabilities' && e.drCr === 'Dr') return s - e.amount;
      return s + e.amount;
    }, 0);
    console.log(`\n  ${cat.toUpperCase()} (${entries.length} entries) — Total: ₹${total.toLocaleString('en-IN')}`);
    entries.forEach((e, i) => {
      console.log(`    ${String(i+1).padStart(3)}. ${e.ledgerName.padEnd(35).slice(0,35)} | ${e.parentGroup.padEnd(25).slice(0,25)} | ${String(e.amount).padStart(10)} | ${e.drCr || '-'}`);
    });
  }

  // ── 6. Cross-check: Receipt total vs Income balance ──
  const incomeBalances = (categories['income'] || []);
  const expenseBalances = (categories['expense'] || []);
  const totalIncomeBalance = incomeBalances.reduce((s, e) => s + e.amount, 0);
  const totalExpenseBalance = expenseBalances.reduce((s, e) => s + e.amount, 0);

  console.log('\n── CROSS-CHECK ──');
  console.log(`  Receipt Vouchers Total  : ₹${rTotal.toLocaleString('en-IN')}`);
  console.log(`  Income Balance Total    : ₹${totalIncomeBalance.toLocaleString('en-IN')}`);
  console.log(`  Difference (Receipt-Income) : ₹${(rTotal - totalIncomeBalance).toLocaleString('en-IN')}`);
  console.log('');
  console.log(`  Payment Vouchers Total  : ₹${pTotal.toLocaleString('en-IN')}`);
  console.log(`  Expense Balance Total   : ₹${totalExpenseBalance.toLocaleString('en-IN')}`);
  console.log(`  Difference (Payment-Expense) : ₹${(pTotal - totalExpenseBalance).toLocaleString('en-IN')}`);
  console.log('');
  console.log(`  Net Profit/Loss (Income - Expense) : ₹${(totalIncomeBalance - totalExpenseBalance).toLocaleString('en-IN')}`);

  // ── 7. Balance Sheet check ──
  const assetBalances = (categories['assets'] || []);
  const liabilityBalances = (categories['liabilities'] || []);
  const totalAssets = assetBalances.reduce((s, e) => s + e.amount, 0);
  const totalLiabilities = liabilityBalances.reduce((s, e) => {
    if (e.drCr === 'Dr') return s - e.amount;
    return s + e.amount;
  }, 0);

  console.log('\n── BALANCE SHEET CHECK ──');
  console.log(`  Total Assets      : ₹${totalAssets.toLocaleString('en-IN')}`);
  console.log(`  Total Liabilities : ₹${totalLiabilities.toLocaleString('en-IN')}`);
  console.log(`  Difference        : ₹${(totalAssets - totalLiabilities).toLocaleString('en-IN')}`);
  if (totalAssets === totalLiabilities) {
    console.log('  ✅ Balance Sheet BALANCED');
  } else {
    console.log('  ⚠️  Balance Sheet NOT balanced');
  }

  // ── 8. Check for duplicates ──
  console.log('\n── DUPLICATE CHECK ──');
  const seen = new Map();
  let dupes = 0;
  for (const v of vouchers) {
    const key = `${v.voucherType}|${v.date}|${v.partyName}|${v.amount}`;
    if (seen.has(key)) {
      dupes++;
      console.log(`  ⚠️  Possible duplicate: ${v.voucherType} | ${v.date} | ${v.partyName} | ₹${v.amount}`);
    }
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  if (dupes === 0) console.log('  ✅ No duplicates found');

  // ── 9. Check for missing fields ──
  console.log('\n── MISSING FIELDS CHECK ──');
  let missing = 0;
  for (const v of vouchers) {
    const issues = [];
    if (!v.date) issues.push('date');
    if (!v.partyName) issues.push('partyName');
    if (!v.amount && v.amount !== 0) issues.push('amount');
    if (!v.paymentMode) issues.push('paymentMode');
    if (!v.narration) issues.push('narration');
    if (issues.length > 0) {
      missing++;
      console.log(`  ⚠️  ${v.voucherType} | ${v.date} | ${v.partyName} — missing: ${issues.join(', ')}`);
    }
  }
  if (missing === 0) console.log('  ✅ All vouchers have complete data');

  // ── 10. Date range check ──
  console.log('\n── DATE RANGE CHECK ──');
  const outOfRange = vouchers.filter(v => {
    return v.date < '2024-04-01' || v.date > '2025-03-31';
  });
  if (outOfRange.length === 0) {
    console.log('  ✅ All voucher dates within FY 2024-25 (Apr 2024 – Mar 2025)');
  } else {
    outOfRange.forEach(v => {
      console.log(`  ⚠️  Out of range: ${v.voucherType} | ${v.date} | ${v.partyName} | ₹${v.amount}`);
    });
  }

  // ── 11. Monthly breakdown ──
  console.log('\n── MONTHLY BREAKDOWN ──');
  const months = {};
  for (const v of vouchers) {
    const m = v.date.slice(0, 7); // YYYY-MM
    if (!months[m]) months[m] = { receipts: 0, payments: 0, rAmt: 0, pAmt: 0 };
    if (v.voucherType === 'Receipt') { months[m].receipts++; months[m].rAmt += v.amount; }
    if (v.voucherType === 'Payment') { months[m].payments++; months[m].pAmt += v.amount; }
  }
  console.log(`  ${'Month'.padEnd(10)} | ${'Rcpts'.padStart(5)} | ${'Rcpt Amt'.padStart(12)} | ${'Pmts'.padStart(5)} | ${'Pmt Amt'.padStart(12)}`);
  for (const m of Object.keys(months).sort()) {
    const d = months[m];
    console.log(`  ${m.padEnd(10)} | ${String(d.receipts).padStart(5)} | ${String(d.rAmt).padStart(12)} | ${String(d.payments).padStart(5)} | ${String(d.pAmt).padStart(12)}`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('  AUDIT COMPLETE');
  console.log(`${'='.repeat(70)}\n`);

  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
