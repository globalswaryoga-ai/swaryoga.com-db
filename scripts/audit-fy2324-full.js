// Full FY 2023-24 audit report: receipts, payments, journals, income, expenses, BS difference
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const fy = '2023-24';

  // ═══════════════════════════════════════════════════════════
  // 1. BALANCE SHEET DIFFERENCE NARRATION
  // ═══════════════════════════════════════════════════════════
  const balances = db.collection('tally_manual_balances');
  const bsEntries = await balances.find({ financialYear: fy }).sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();

  const assets = bsEntries.filter(e => e.category === 'asset');
  const liabilities = bsEntries.filter(e => e.category === 'liability');

  const effectiveAmt = (e) => {
    const amt = Math.abs(e.amount || 0);
    if (e.category === 'asset') return e.drCr === 'Cr' ? -amt : amt;
    if (e.category === 'liability') return e.drCr === 'Dr' ? -amt : amt;
    return amt;
  };

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        FY 2023-24 — FULL AUDIT REPORT FOR CA               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  BALANCE SHEET — DIFFERENCE NARRATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('  ASSETS:');
  let totalAssets = 0;
  let prevGroup = '';
  for (const e of assets) {
    if (e.parentGroup !== prevGroup) {
      prevGroup = e.parentGroup;
      console.log(`\n    [${e.parentGroup}]`);
    }
    const eff = effectiveAmt(e);
    totalAssets += eff;
    const sign = e.drCr === 'Cr' ? '(Cr)' : '(Dr)';
    console.log(`      ${e.ledgerName.padEnd(35)} ₹${e.amount.toLocaleString('en-IN').padStart(12)}  ${sign}  → effective: ₹${eff.toLocaleString('en-IN')}`);
  }
  console.log(`\n    TOTAL ASSETS (effective): ₹${totalAssets.toLocaleString('en-IN')}`);

  console.log('\n  LIABILITIES:');
  let totalLiabilities = 0;
  prevGroup = '';
  for (const e of liabilities) {
    if (e.parentGroup !== prevGroup) {
      prevGroup = e.parentGroup;
      console.log(`\n    [${e.parentGroup}]`);
    }
    const eff = effectiveAmt(e);
    totalLiabilities += eff;
    const sign = e.drCr === 'Cr' ? '(Cr)' : '(Dr)';
    const flag = e.drCr === 'Dr' ? ' ← REDUCES LIABILITIES' : '';
    console.log(`      ${e.ledgerName.padEnd(35)} ₹${e.amount.toLocaleString('en-IN').padStart(12)}  ${sign}  → effective: ₹${eff.toLocaleString('en-IN')}${flag}`);
  }
  console.log(`\n    TOTAL LIABILITIES (effective): ₹${totalLiabilities.toLocaleString('en-IN')}`);
  console.log(`\n    DIFFERENCE (Assets - Liabilities): ₹${(totalAssets - totalLiabilities).toLocaleString('en-IN')}`);

  if (totalAssets === totalLiabilities) {
    console.log('    ✅ BALANCED!');
  }

  // ═══════════════════════════════════════════════════════════
  // 2. ALL RECEIPT VOUCHERS
  // ═══════════════════════════════════════════════════════════
  const vouchers = db.collection('tally_manual_vouchers');

  const receipts = await vouchers.find({ financialYear: fy, voucherType: 'Receipt' }).sort({ date: 1 }).toArray();
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  RECEIPT VOUCHERS — FY ${fy} (${receipts.length} entries)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let receiptTotal = 0;
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    receiptTotal += r.amount || 0;
    console.log(`  ${(i+1).toString().padStart(3)}. ${r.date || 'N/A'}  |  ${(r.voucherNumber || '-').padEnd(10)}  |  ${(r.partyName || '').padEnd(30)}  |  ₹${(r.amount || 0).toLocaleString('en-IN').padStart(12)}  |  ${r.paymentMode || '-'}  |  ${r.narration || '-'}`);
  }
  console.log(`\n  TOTAL RECEIPTS: ₹${receiptTotal.toLocaleString('en-IN')}`);

  // ═══════════════════════════════════════════════════════════
  // 3. ALL PAYMENT VOUCHERS
  // ═══════════════════════════════════════════════════════════
  const payments = await vouchers.find({ financialYear: fy, voucherType: 'Payment' }).sort({ date: 1 }).toArray();
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  PAYMENT VOUCHERS — FY ${fy} (${payments.length} entries)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let paymentTotal = 0;
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    paymentTotal += p.amount || 0;
    console.log(`  ${(i+1).toString().padStart(3)}. ${p.date || 'N/A'}  |  ${(p.voucherNumber || '-').padEnd(10)}  |  ${(p.partyName || '').padEnd(30)}  |  ₹${(p.amount || 0).toLocaleString('en-IN').padStart(12)}  |  ${p.paymentMode || '-'}  |  ${p.narration || '-'}`);
  }
  console.log(`\n  TOTAL PAYMENTS: ₹${paymentTotal.toLocaleString('en-IN')}`);

  // ═══════════════════════════════════════════════════════════
  // 4. JOURNAL VOUCHERS
  // ═══════════════════════════════════════════════════════════
  const journals = await vouchers.find({ financialYear: fy, voucherType: 'Journal' }).sort({ date: 1 }).toArray();
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  JOURNAL VOUCHERS — FY ${fy} (${journals.length} entries)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let journalTotal = 0;
  for (let i = 0; i < journals.length; i++) {
    const j = journals[i];
    journalTotal += j.amount || 0;
    console.log(`  ${(i+1).toString().padStart(3)}. ${j.date || 'N/A'}  |  ${(j.voucherNumber || '-').padEnd(10)}  |  ${(j.partyName || '').padEnd(30)}  |  ${(j.ledgerName || '').padEnd(25)}  |  ₹${(j.amount || 0).toLocaleString('en-IN').padStart(12)}  |  ${j.narration || '-'}`);
  }
  console.log(`\n  TOTAL JOURNALS: ₹${journalTotal.toLocaleString('en-IN')}`);

  // ═══════════════════════════════════════════════════════════
  // 5. INCOME & EXPENSE (from manual balances P&L)
  // ═══════════════════════════════════════════════════════════
  const incomeEntries = bsEntries.filter(e => e.category === 'income');
  const expenseEntries = bsEntries.filter(e => e.category === 'expense');

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  INCOME — FY ${fy} (${incomeEntries.length} entries)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let totalIncome = 0;
  for (const e of incomeEntries) {
    const sign = e.drCr === 'Dr' ? '(Dr)' : '(Cr)';
    totalIncome += e.amount || 0;
    console.log(`    ${e.ledgerName.padEnd(40)} ₹${(e.amount || 0).toLocaleString('en-IN').padStart(12)}  ${sign}  [${e.parentGroup || '-'}]`);
  }
  console.log(`\n    TOTAL INCOME: ₹${totalIncome.toLocaleString('en-IN')}`);

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  EXPENSES — FY ${fy} (${expenseEntries.length} entries)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let totalExpense = 0;
  for (const e of expenseEntries) {
    const sign = e.drCr === 'Dr' ? '(Dr)' : '(Cr)';
    totalExpense += e.amount || 0;
    console.log(`    ${e.ledgerName.padEnd(40)} ₹${(e.amount || 0).toLocaleString('en-IN').padStart(12)}  ${sign}  [${e.parentGroup || '-'}]`);
  }
  console.log(`\n    TOTAL EXPENSES: ₹${totalExpense.toLocaleString('en-IN')}`);
  console.log(`\n    NET PROFIT/LOSS: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}`);

  // ═══════════════════════════════════════════════════════════
  // GRAND SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                 GRAND SUMMARY — FY 2023-24                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Receipt Vouchers:  ${receipts.length.toString().padStart(5)}   Total: ₹${receiptTotal.toLocaleString('en-IN').padStart(14)} ║`);
  console.log(`║  Payment Vouchers:  ${payments.length.toString().padStart(5)}   Total: ₹${paymentTotal.toLocaleString('en-IN').padStart(14)} ║`);
  console.log(`║  Journal Vouchers:  ${journals.length.toString().padStart(5)}   Total: ₹${journalTotal.toLocaleString('en-IN').padStart(14)} ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  All Vouchers:      ${(receipts.length + payments.length + journals.length).toString().padStart(5)}                                ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Income:           ₹${totalIncome.toLocaleString('en-IN').padStart(14)}                ║`);
  console.log(`║  Total Expenses:         ₹${totalExpense.toLocaleString('en-IN').padStart(14)}                ║`);
  console.log(`║  Net Profit/Loss:        ₹${(totalIncome - totalExpense).toLocaleString('en-IN').padStart(14)}                ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Assets:           ₹${totalAssets.toLocaleString('en-IN').padStart(14)}                ║`);
  console.log(`║  Total Liabilities:      ₹${totalLiabilities.toLocaleString('en-IN').padStart(14)}                ║`);
  console.log(`║  BS Difference:          ₹${(totalAssets - totalLiabilities).toLocaleString('en-IN').padStart(14)}                ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
