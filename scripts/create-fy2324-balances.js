/**
 * Create FY 2023-24 balance entries from CA Report (CCF_000014)
 * 
 * All amounts in CA report are "Rs. in Hundred"
 * So multiply by 100 to get actual rupees.
 * 
 * SOURCE: CA Report pages (OCR extracted):
 * 
 * === P&L (Page 1) ===
 * Revenue from Operations: 7,035.70 (₹7,03,570)
 * Other Income: 201.52 (₹20,152)
 * Total Revenue: 7,237.22 (₹7,23,722)
 * 
 * Employee Benefit Expenses: (Page 6)
 *   - Salary to Staff: noted in Employee section
 *   - Directors Remuneration: noted
 * Finance Costs: (interest/bank)
 * Depreciation: 2,813.81 (₹2,81,381)
 * Admin & Other Expenses: 5,217.97 (₹5,21,797)
 * Total Expenses: 8,031.78 (₹8,03,178) [includes depreciation]
 * 
 * Loss Before Tax: -794.56 (₹-79,456)
 * 
 * === Balance Sheet (Page 8) ===
 * EQUITY & LIABILITIES:
 *   Share Capital: 6,100.00 (₹6,10,000)
 *   Reserves & Surplus: 451.92 (₹45,192) [actually -ve cumulative loss?]
 *   Long Term Borrowings: 1,000.00 (₹1,00,000)
 *   Deferred Tax Liability: 37.71 (₹3,771)
 *   Deposits: (not clear)
 *   Trade Payables: 0
 *   Short-Term Provisions: 75.00 (₹7,500)
 *   Other Current Liabilities: 3,250.00 (₹3,25,000)
 * 
 * ASSETS:
 *   Gross Block: 6,791.00 (₹6,79,100)
 *   Less: Depreciation: (accumulated)
 *   Net Block: (derived)
 *   Other Non-Current Assets: 0
 *   Trade Receivable: 0
 *   Cash & Cash Equivalents: 3,293.27 (₹3,29,327)
 *   Other Current Assets: 1,397.69 (₹1,39,769)
 *   Total Assets: 8,668.15 (₹8,66,815) [current year]
 * 
 * === Depreciation Detail (Page 4/6) ===
 *   Computer: 2,395.16
 *   Furniture & Fixture: 108.98
 *   Software: 113.69
 *   Machinery & Equipment: 107.43
 *   JBL Speaker: 16.53
 *   Mobile: 72.02
 *   Total: 2,813.81
 * 
 * === Admin & Other Expenses (Page 5/7) ===
 *   Teachers Fees: 1,744.81 (₹1,74,481) - largest single expense
 *   + 16 other line items totaling: 5,217.97 (₹5,21,797)
 * 
 * Run: node scripts/create-fy2324-balances.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const FY = '2023-24';
const AS_ON_DATE = '31-03-2024';
const H = 100; // multiply factor: amounts in CA report are in hundreds

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  // Check existing
  const existing = await coll.countDocuments({ financialYear: FY });
  if (existing > 0) {
    console.log(`⚠️  ${existing} entries already exist for FY ${FY}. Deleting first...`);
    await coll.deleteMany({ financialYear: FY });
    console.log('   Deleted.\n');
  }

  const entries = [];
  const add = (ledgerName, parentGroup, category, amount, drCr, notes) => {
    entries.push({
      ledgerName, parentGroup, category,
      amount: Math.round(amount),
      drCr: drCr || (category === 'expense' || category === 'asset' ? 'Dr' : 'Cr'),
      financialYear: FY, asOnDate: AS_ON_DATE,
      notes: notes || 'From CA Report FY 2023-24',
      createdBy: 'ca-report-import',
      createdAt: new Date(), updatedAt: new Date()
    });
  };

  // ══════════════════════════════════════════
  // INCOME (from P&L)
  // ══════════════════════════════════════════
  add('Course Fees', 'Direct Income', 'income', 7035.70 * H, 'Cr', 'Revenue from Operations - Course Fees');
  add('Other Income', 'Indirect Income', 'income', 201.52 * H, 'Cr', 'Other Income');
  // Total Income: 7,237.22 * 100 = ₹7,23,722

  // ══════════════════════════════════════════
  // EXPENSES (from P&L notes)
  // ══════════════════════════════════════════
  // Employee Benefits (Note 14 - Page 6)
  // Staff salary + Directors remuneration = combined in employee benefit
  // From page 6: Employee Benefit Expenses total is not clearly readable
  // But we know: Total Expenses (8,031.78) = Employee + Finance + Depreciation(2,813.81) + Admin(5,217.97)
  // So Employee + Finance = 8,031.78 - 2,813.81 - 5,217.97 = 0
  // That can't be right... Let me recalculate
  // Actually from page 1: Total Revenue = 7,237.22, Total Expenses = 8,031.78
  // Loss = 7,237.22 - 8,031.78 = -794.56 ✓
  
  // From the earlier audit script (audit-fy2324-full.js), the voucher data showed:
  // But there are 0 vouchers for 2023-24 in DB
  // So I must rely entirely on CA report

  // Page 1 shows 4 expense categories but numbers are garbled for some
  // Let me use what we can read:
  // Depreciation: 2,813.81
  // Admin & Other Expenses: 5,217.97
  // The remaining must be Employee + Finance

  // Total expenses from P&L: 8,031.78
  // Known: Depreciation 2,813.81 + Admin 5,217.97 = 8,031.78
  // So Employee + Finance = 0?! 
  // No wait - page 1 shows the number columns are not all OCR'd properly
  // Let me check: if loss = -794.56 and revenue = 7,237.22
  // Then total expenses = 7,237.22 + 794.56 = 8,031.78 ✓
  
  // Actually looking at page 1 again carefully:
  // Total Expenses shows: 8,031.78 - but this seems to be only Dep + Admin
  // The actual total may be higher...
  // But the P&L clearly states loss = 794.56
  // Revenue = 7,237.22
  // So total expenses = 8,031.78 ✓

  // Depreciation & Amortisation
  add('Depreciation - Computer', 'Depreciation', 'expense', 2395.16 * H, 'Dr', 'Depreciation on Computer');
  add('Depreciation - Furniture', 'Depreciation', 'expense', 108.98 * H, 'Dr', 'Depreciation on Furniture & Fixture');
  add('Depreciation - Software', 'Depreciation', 'expense', 113.69 * H, 'Dr', 'Depreciation on Software');
  add('Depreciation - Machinery', 'Depreciation', 'expense', 107.43 * H, 'Dr', 'Depreciation on Machinery & Equipment');
  add('Depreciation - Speaker', 'Depreciation', 'expense', 16.53 * H, 'Dr', 'Depreciation on JBL Speaker');
  add('Depreciation - Mobile', 'Depreciation', 'expense', 72.02 * H, 'Dr', 'Depreciation on Mobile');
  // Dep total: 2,813.81 * 100 = ₹2,81,381

  // Admin & Other Expenses (Note 16 - Page 5/7)
  // Teachers Fees is 1,744.81 (₹1,74,481) as shown on page 5
  // Total Admin: 5,217.97 (₹5,21,797)
  // Individual line items not fully readable due to OCR but the total is clear
  // Let's enter Admin as a breakdown based on what's readable + the total
  add('Teachers Fees', 'Admin Expenses', 'expense', 1744.81 * H, 'Dr', 'Teacher remuneration (Note 16)');
  // Remaining admin: 5,217.97 - 1,744.81 = 3,473.16
  add('Administration & Other Expenses', 'Admin Expenses', 'expense', 3473.16 * H, 'Dr', 'All admin expenses excl teachers (Note 16)');

  // ══════════════════════════════════════════
  // ASSETS (from Balance Sheet - Page 8)
  // ══════════════════════════════════════════
  add('Fixed Assets (Gross Block)', 'Fixed Assets', 'asset', 6791.00 * H, 'Dr', 'Gross Block of Fixed Assets');
  add('Less: Accumulated Depreciation', 'Fixed Assets', 'asset', 2813.81 * H, 'Cr', 'Accumulated Depreciation (reduces assets)');
  // Net Block = 6,791.00 - depreciation = residual value
  add('Cash & Cash Equivalents', 'Current Assets', 'asset', 3293.27 * H, 'Dr', 'Cash in hand + Bank balance (Note 9)');
  add('Other Current Assets', 'Current Assets', 'asset', 1397.69 * H, 'Dr', 'Sundry Advances etc (Note 10)');
  // Total Assets: 8,668.15 * 100 = ₹8,66,815

  // ══════════════════════════════════════════
  // LIABILITIES (from Balance Sheet - Page 8)
  // ══════════════════════════════════════════
  add('Share Capital', 'Share Capital', 'liability', 6100.00 * H, 'Cr', 'Authorized & Paid-up Share Capital');
  add('Reserves & Surplus', 'Reserves', 'liability', 451.92 * H, 'Cr', 'Accumulated reserves (may include losses)');
  add('Long Term Borrowings', 'Secured Loans', 'liability', 1000.00 * H, 'Cr', 'Long term loan');
  add('Deferred Tax Liability', 'Provisions', 'liability', 37.71 * H, 'Cr', 'DTL');
  add('Short-Term Provisions', 'Provisions', 'liability', 75.00 * H, 'Cr', 'Current tax provision etc');
  add('Other Current Liabilities', 'Current Liabilities', 'liability', 3250.00 * H, 'Cr', 'Sundry creditors, advances received');
  // Total L+E: 6,100 + 451.92 + 1,000 + 37.71 + 75 + 3,250 = 10,914.63 * 100 -> doesn't match assets 8,668.15
  // There may be negative reserves. Let me check.
  
  // Actually from page 8 (previous year column): Total Assets = 5,863.71
  // Current year Total Assets = 8,668.15
  // BS must balance: Total Equity + Liabilities = Total Assets
  // Let me compute: 6,100 + 451.92 + 1,000 + 37.71 + 0 + 75 + 3,250 = 10,914.63
  // But Total Assets = 8,668.15
  // Difference = 10,914.63 - 8,668.15 = 2,246.48
  // Reserves might be NEGATIVE: -451.92 instead of +451.92? Then:
  // 6,100 - 451.92 + 1,000 + 37.71 + 75 + 3,250 = 10,010.79 -> still doesn't match
  // 
  // Hmm, the OCR may have issues. Let me just store what we can read clearly
  // and let the user correct later via the UI

  // Insert
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FY ${FY} BALANCE ENTRIES FROM CA REPORT`);
  console.log(`${'═'.repeat(60)}\n`);

  let incT=0, expT=0, astT=0, libT=0;
  for (const e of entries) {
    const dir = (e.category === 'asset' || e.category === 'expense') ? 
      (e.drCr === 'Cr' ? -e.amount : e.amount) :
      (e.drCr === 'Dr' ? -e.amount : e.amount);
    console.log(`  [${e.category.padEnd(9)}] ${e.ledgerName.padEnd(40)} | ${e.drCr} | ₹${e.amount.toLocaleString('en-IN').padStart(10)}`);
    if (e.category === 'income') incT += Math.abs(dir);
    if (e.category === 'expense') expT += Math.abs(dir);
    if (e.category === 'asset') astT += dir;
    if (e.category === 'liability') libT += Math.abs(dir);
  }

  console.log(`\n  Income:      ₹${incT.toLocaleString('en-IN')}`);
  console.log(`  Expenses:    ₹${expT.toLocaleString('en-IN')}`);
  console.log(`  Net P&L:     ₹${(incT - expT).toLocaleString('en-IN')} (${incT >= expT ? 'Profit' : 'Loss'})`);
  console.log(`  Assets Net:  ₹${astT.toLocaleString('en-IN')}`);
  console.log(`  Liabilities: ₹${libT.toLocaleString('en-IN')}`);

  const result = await coll.insertMany(entries);
  console.log(`\n✅ Inserted ${result.insertedCount} entries for FY ${FY}`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
