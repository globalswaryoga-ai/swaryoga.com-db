/**
 * Fix FY 2023-24 balance entries to EXACTLY match CA Report
 * Source: CCF_000014 (1).pdf — OCR at 600 DPI
 * All amounts in "Rs. in Hundred" → multiply by 100
 * 
 * Run: node scripts/fix-fy2324-from-ca.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const FY = '2023-24';
const AS_ON = '31-03-2024';
const H = 100;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  // Delete existing FY 2023-24 entries
  const del = await coll.deleteMany({ financialYear: FY });
  console.log(`Deleted ${del.deletedCount} existing FY ${FY} entries.\n`);

  const entries = [];
  const add = (ledger, parent, cat, amtInHundreds, drCr, notes) => {
    entries.push({
      ledgerName: ledger, parentGroup: parent, category: cat,
      amount: Math.round(amtInHundreds * H * 100) / 100,
      drCr, financialYear: FY, asOnDate: AS_ON,
      notes: notes || 'CA Report FY 2023-24',
      createdBy: 'ca-report-import',
      createdAt: new Date(), updatedAt: new Date()
    });
  };

  // ═══════════════════════════════════════════════
  // INCOME — P&L Page 1
  // ═══════════════════════════════════════════════
  add('Course Fees', 'Direct Income', 'income', 7035.70, 'Cr', 'Note 11: Revenue from Operations');
  add('Other Income', 'Indirect Income', 'income', 201.52, 'Cr', 'Note 12: Other Income');
  // Total Revenue: 7,237.22 = ₹7,23,722

  // ═══════════════════════════════════════════════
  // EXPENSES — P&L
  // ═══════════════════════════════════════════════

  // Note 13: Employee Benefit = 0 (shown as - in CA report)
  // Note 14: Finance Costs = 0

  // Note 15: Depreciation (Page 4/6) — ₹2,81,381 total
  add('Depreciation - Computer', 'Depreciation', 'expense', 2395.16, 'Dr', 'Note 15');
  add('Depreciation - Furniture & Fixture', 'Depreciation', 'expense', 108.98, 'Dr', 'Note 15');
  add('Depreciation - Software', 'Depreciation', 'expense', 113.69, 'Dr', 'Note 15');
  add('Depreciation - Machinery & Equipment', 'Depreciation', 'expense', 107.43, 'Dr', 'Note 15');
  add('Depreciation - JBL Speaker', 'Depreciation', 'expense', 16.53, 'Dr', 'Note 15');
  add('Depreciation - Mobile', 'Depreciation', 'expense', 72.02, 'Dr', 'Note 15');
  // Sub-total: 2,813.81

  // Note 16: Administration & Other Expenses (Page 5/7) — ₹5,21,797 total
  add('Audit Fees', 'Admin Expenses', 'expense', 0, 'Dr', 'Note 16 #1 (nil in 2023-24)');
  add('Bank Charges & Commission', 'Admin Expenses', 'expense', 0.41, 'Dr', 'Note 16 #2');
  // Consulting fees: 0
  // Incorporation Expenses: 0
  add('Office Rent', 'Admin Expenses', 'expense', 525.00, 'Dr', 'Note 16 #5');
  add('Advertisement Expenses', 'Admin Expenses', 'expense', 259.00, 'Dr', 'Note 16 #6');
  add('Electricity Expenses', 'Admin Expenses', 'expense', 88.05, 'Dr', 'Note 16 #7');
  add('Office Expenses', 'Admin Expenses', 'expense', 281.22, 'Dr', 'Note 16 #8');
  add('Class Expenses', 'Admin Expenses', 'expense', 711.80, 'Dr', 'Note 16 #9');
  add('Training Expenses', 'Admin Expenses', 'expense', 86.60, 'Dr', 'Note 16 #10');
  add('Internet & Mobile Expenses', 'Admin Expenses', 'expense', 267.98, 'Dr', 'Note 16 #11');
  add('Printing & Stationery', 'Admin Expenses', 'expense', 176.50, 'Dr', 'Note 16 #12');
  add('Professional Fees', 'Admin Expenses', 'expense', 363.00, 'Dr', 'Note 16 #13');
  add('ROC Fees', 'Admin Expenses', 'expense', 1.00, 'Dr', 'Note 16 #14');
  add('SA Tax Paid', 'Admin Expenses', 'expense', 11.80, 'Dr', 'Note 16 #15');
  add('Travelling Expenses', 'Admin Expenses', 'expense', 700.80, 'Dr', 'Note 16 #16');
  add('Teachers Fees', 'Admin Expenses', 'expense', 1744.81, 'Dr', 'Note 16 #17');
  // Admin sub-total check: 0+0.41+0+0+525+259+88.05+281.22+711.80+86.60+267.98+176.50+363+1+11.80+700.80+1744.81 = 5,217.97 ✓

  // Tax Expense from P&L:
  // Current Tax: 0
  // Deferred Tax: -304.93 (this is a credit/negative = DTA, reduces the loss)
  // Actually in the P&L:
  //   Loss before tax: -794.56
  //   Deferred Tax: -304.93 (tax benefit, shown as negative)
  //   Loss after tax: -489.63
  // Deferred Tax goes to BS as DTL (liability side, negative = DTA)
  // NOT an expense line—it's already in BS as "Deferred Tax Liability: -304.93"

  // Total Expenses: 2,813.81 + 5,217.97 = 8,031.78 = ₹8,03,178 ✓
  // Loss before tax: 7,237.22 - 8,031.78 = -794.56 ✓
  // Loss after tax: -794.56 - (-304.93) = -489.63 ✓

  // ═══════════════════════════════════════════════
  // ASSETS — Balance Sheet Page 8
  // ═══════════════════════════════════════════════
  add('Fixed Assets (Net Block)', 'Fixed Assets', 'asset', 3977.19, 'Dr', 'Note 7: Gross 6791.00 - Dep 2813.81');
  add('Cash & Cash Equivalents', 'Current Assets', 'asset', 3293.27, 'Dr', 'Note 9: Cash 2918.86 + Bank 374.41');
  add('Other Current Assets', 'Current Assets', 'asset', 1397.69, 'Dr', 'Note 10: Fees Receivable 1117.69 + Sundry Advances 280.00');
  // Total Assets: 3,977.19 + 3,293.27 + 1,397.69 = 8,668.15 = ₹8,66,815 ✓

  // ═══════════════════════════════════════════════
  // LIABILITIES — Balance Sheet Page 8
  // ═══════════════════════════════════════════════
  add('Share Capital', 'Share Capital', 'liability', 6100.00, 'Cr', 'Note 1');
  add('Reserves & Surplus', 'Reserves', 'liability', 451.92, 'Dr', 'Note 2: Accumulated Loss (Dr = negative reserve)');
  // Long Term Borrowings: 0 (shown as -)
  add('Deferred Tax Liability', 'Provisions', 'liability', 304.93, 'Dr', 'Note 4: DTL is negative (Dr = DTA)');
  // Deposits: 0
  add('Short-Term Provisions', 'Provisions', 'liability', 75.00, 'Cr', 'Note 5');
  add('Other Current Liabilities', 'Current Liabilities', 'liability', 3250.00, 'Cr', 'Note 6');
  // Total E+L: 6100 - 451.92 + 0 - 304.93 + 0 + 75 + 3250 = 8,668.15 ✓ BALANCED!

  // ═══════════════════════════════════════════════
  // INSERT & VERIFY
  // ═══════════════════════════════════════════════
  // Remove zero-amount entries
  const nonZero = entries.filter(e => e.amount > 0);

  console.log(`${'═'.repeat(65)}`);
  console.log(`  FY ${FY} — EXACT CA REPORT ENTRIES`);
  console.log(`${'═'.repeat(65)}`);

  let incT=0, expT=0, astT=0, libT=0;
  for (const e of nonZero) {
    const sign = e.drCr === 'Dr' ? '' : '';
    console.log(`  [${e.category.padEnd(9)}] ${e.drCr} | ${e.ledgerName.padEnd(40)} | ₹${e.amount.toLocaleString('en-IN').padStart(10)}`);

    if (e.category === 'income') incT += e.amount;
    if (e.category === 'expense') expT += e.amount;
    if (e.category === 'asset') {
      astT += (e.drCr === 'Cr' ? -e.amount : e.amount);
    }
    if (e.category === 'liability') {
      libT += (e.drCr === 'Dr' ? -e.amount : e.amount);
    }
  }

  console.log(`\n  ── P&L ──`);
  console.log(`  Income:         ₹${incT.toLocaleString('en-IN')}`);
  console.log(`  Expenses:       ₹${expT.toLocaleString('en-IN')}`);
  console.log(`  Net (Loss):     ₹${(incT - expT).toLocaleString('en-IN')}`);
  console.log(`\n  ── Balance Sheet ──`);
  console.log(`  Total Assets:   ₹${astT.toLocaleString('en-IN')}`);
  console.log(`  Total E+L:      ₹${libT.toLocaleString('en-IN')}`);
  console.log(`  Difference:     ₹${(astT - libT).toLocaleString('en-IN')} ${astT === libT ? '✅ BALANCED!' : '⚠️ MISMATCH'}`);

  const result = await coll.insertMany(nonZero);
  console.log(`\n✅ Inserted ${result.insertedCount} entries for FY ${FY}`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
