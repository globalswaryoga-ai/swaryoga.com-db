/**
 * Fix FY 2024-25 Balance Entries — User Confirmed Amounts
 * 
 * User's confirmed expense breakdown:
 *   - Mohan Remuneration: ₹75,000/year
 *   - Upamanyu: ₹36,000/year (₹3,000 × 12)
 *   - Resort Project: ₹3,50,000 (Asset — CWIP)
 *   - Office Rent: ₹3,500/month → ₹42,000/year
 *   - Net Recharge: ₹900/month → ₹10,800/year
 *   - CA Fees: ₹10,000
 *   - Office Exp, Class Exp, Travelling Exp — from bank statement
 *   - INVESTMENT ₹6,36,005 — Unsecured Loans (liability)
 *   - Dividends ₹47,100 — Appropriation from Reserves (not P&L)
 * 
 * Run: node scripts/fix-fy2425-final.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const balCol = mongoose.connection.collection('tally_manual_balances');
  
  const FY = '2024-25';
  
  // ── Step 1: Read current entries ──
  const existing = await balCol.find({ financialYear: FY }).toArray();
  console.log(`Current FY 2024-25 entries: ${existing.length}`);
  
  // ── Step 2: Delete ALL current FY 2024-25 entries ──
  const delResult = await balCol.deleteMany({ financialYear: FY });
  console.log(`Deleted: ${delResult.deletedCount} entries\n`);
  
  // ── Step 3: Insert corrected entries ──
  // Based on user input + bank statement analysis
  // 
  // BANK STATEMENT SUMMARY:
  //   Total Credits (Income): ₹12,89,296.72
  //   Total Debits (Expenses): ₹12,13,537.53
  //   Contra/Transfers: ₹1,50,100
  //   Real Expenses: ₹10,63,437.53
  //
  // But for P&L, we use VOUCHER-based data (393 payments + 33 receipts)
  //   Receipt income: ₹12,04,224.20
  //   Payment expenses: ₹10,96,437.53
  //
  // INCOME BREAKDOWN (from receipts):
  //   Course Fees (Bank/UPI): ₹10,79,286.72 (existing)
  //   Cash Workshops (deposited to bank as "Cash to Bank"): included in receipts
  //   Actually the Receipts include all ₹12,04,224.20 but the balance entry
  //   for Course Fees only shows ₹10,79,286.72 because some are contra.
  //
  // For simplicity, let's use the P&L from actual voucher aggregation.
  // The API already computes P&L from vouchers (aggregates ledgerName).
  // We only need BALANCE SHEET entries here.
  
  const now = new Date();
  const base = {
    financialYear: FY,
    asOnDate: '2025-03-31',
    createdAt: now,
    updatedAt: now,
    createdBy: 'fix-fy2425-final',
  };
  
  // ════════════════════════════════════════════════════════════════
  // ASSETS
  // ════════════════════════════════════════════════════════════════
  
  // Fixed Assets — Opening WDV from FY 2023-24 CA report
  // Computer: 2,42,483 | Furniture: 31,202 | JBL Speaker: 25,847
  // Machinery: 30,757 | Mobile: 60,799 | Software: 6,631
  // Total Opening Net Block: 3,97,719
  // Depreciation per CA rates (WDV method):
  //   Computer 63.16%: 1,53,169 → Closing 89,314
  //   Furniture 25.89%: 8,083 → Closing 23,119
  //   JBL Speaker 25.89%: 6,694 → Closing 19,153
  //   Machinery 25.89%: 7,966 → Closing 22,791
  //   Mobile 45.07%: 27,404 → Closing 33,395
  //   Software 63.16%: 4,188 → Closing 2,443
  // Total Depreciation: 2,07,504 (rounded per individual)
  // Closing Net Block: 1,90,215
  
  const fixedAssets = [
    { ledger: 'Computer', opening: 242483, rate: 0.6316 },
    { ledger: 'Furniture and Fixture', opening: 31202, rate: 0.2589 },
    { ledger: 'JBL Speaker', opening: 25847, rate: 0.2589 },
    { ledger: 'Machinery & Equipment', opening: 30757, rate: 0.2589 },
    { ledger: 'Mobile', opening: 60799, rate: 0.4507 },
    { ledger: 'Software', opening: 6631, rate: 0.6316 },
  ];
  
  let totalDepreciation = 0;
  let totalClosingNetBlock = 0;
  const assetEntries = [];
  const expenseEntries = [];
  
  for (const fa of fixedAssets) {
    const dep = Math.round(fa.opening * fa.rate);
    const closing = fa.opening - dep;
    totalDepreciation += dep;
    totalClosingNetBlock += closing;
    
    // Asset entry — closing WDV
    assetEntries.push({
      ...base,
      ledgerName: fa.ledger,
      parentGroup: 'Fixed Assets',
      category: 'asset',
      amount: closing,
      drCr: 'Dr',
      notes: `Opening: ₹${fa.opening.toLocaleString('en-IN')}, Dep @${(fa.rate*100).toFixed(2)}%: ₹${dep.toLocaleString('en-IN')}, Closing: ₹${closing.toLocaleString('en-IN')}`,
    });
    
    // Depreciation expense entry
    expenseEntries.push({
      ...base,
      ledgerName: `Depreciation - ${fa.ledger.replace(' and Fixture', '').replace(' & Equipment', '')}`,
      parentGroup: 'Depreciation',
      category: 'expense',
      amount: dep,
      drCr: 'Dr',
      notes: `WDV depreciation on ${fa.ledger}`,
    });
  }
  
  console.log(`Fixed Assets Closing Net Block: ₹${totalClosingNetBlock.toLocaleString('en-IN')}`);
  console.log(`Total Depreciation: ₹${totalDepreciation.toLocaleString('en-IN')}\n`);
  
  // Other Assets
  // Cash in Hand: user confirmed ₹90,000 actual cash
  // But the DB currently shows ₹2,91,886???
  // Let me think... The user said Cash = ₹90,000 earlier.
  // Kotak Bank: ₹43,750.97 (bank statement closing)
  // Resort Project: ₹3,50,000 (CWIP — user confirmed)
  // Fees Receivable: ₹1,11,769 — this came from existing DB
  // Sundry Advances Paid: ₹28,000 — existing
  // Office Equipment (OnePlus phone): ₹32,050 — from bank statement
  
  assetEntries.push(
    { ...base, ledgerName: 'Cash in Hand', parentGroup: 'Cash & Cash Equivalents', category: 'asset', amount: 90000, drCr: 'Dr', notes: 'User confirmed actual cash' },
    { ...base, ledgerName: 'Kotak Mahindra Bank A/C', parentGroup: 'Bank Accounts', category: 'asset', amount: 43751, drCr: 'Dr', notes: 'Bank statement closing balance 31-Mar-2025' },
    { ...base, ledgerName: 'Resort Project (CWIP)', parentGroup: 'Fixed Assets', category: 'asset', amount: 350000, drCr: 'Dr', notes: 'Resort project payments — Capital WIP — user confirmed ₹3,50,000' },
    { ...base, ledgerName: 'Office Equipment (OnePlus)', parentGroup: 'Fixed Assets', category: 'asset', amount: 32050, drCr: 'Dr', notes: 'OnePlus phone purchased during FY' },
    { ...base, ledgerName: 'Sundry Advances (Paid)', parentGroup: 'Current Assets', category: 'asset', amount: 28000, drCr: 'Dr', notes: 'Advances given' },
  );
  
  // ════════════════════════════════════════════════════════════════
  // EXPENSES (for P&L)
  // ════════════════════════════════════════════════════════════════
  // User confirmed amounts + bank statement categories
  
  expenseEntries.push(
    // Director / Teacher payments
    { ...base, ledgerName: 'Director Remuneration (Mohan)', parentGroup: 'Employee Expenses', category: 'expense', amount: 75000, drCr: 'Dr', notes: 'Mohan remuneration — user confirmed ₹75,000/year' },
    { ...base, ledgerName: 'Upamanyu Remuneration', parentGroup: 'Employee Expenses', category: 'expense', amount: 36000, drCr: 'Dr', notes: 'Upamanyu — ₹3,000/month × 12 — user confirmed' },
    
    // Office & Admin
    { ...base, ledgerName: 'Office Rent', parentGroup: 'Admin Expenses', category: 'expense', amount: 42000, drCr: 'Dr', notes: '₹3,500/month × 12 — user confirmed' },
    { ...base, ledgerName: 'Internet & Mobile Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 10800, drCr: 'Dr', notes: '₹900/month × 12 — user confirmed' },
    { ...base, ledgerName: 'Electricity Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 14650, drCr: 'Dr', notes: 'From bank statement — MSEDCL + light bill' },
    
    // From bank statement
    { ...base, ledgerName: 'Advertisement Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 69550, drCr: 'Dr', notes: 'Meta/Facebook ads — from bank statement' },
    { ...base, ledgerName: 'Office Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 10239, drCr: 'Dr', notes: 'Office exp from bank statement' },
    { ...base, ledgerName: 'Class Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 9860, drCr: 'Dr', notes: 'Class exp from bank statement' },
    { ...base, ledgerName: 'Travelling Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 26458, drCr: 'Dr', notes: 'Travel + fuel from bank statement' },
    
    // Professional & Compliance
    { ...base, ledgerName: 'CA Fees', parentGroup: 'Admin Expenses', category: 'expense', amount: 10000, drCr: 'Dr', notes: 'CA fees — user confirmed ₹10,000' },
    { ...base, ledgerName: 'ROC Filing Fees', parentGroup: 'Admin Expenses', category: 'expense', amount: 13150, drCr: 'Dr', notes: 'Government ROC/compliance — from bank statement' },
    
    // Software & Subscriptions
    { ...base, ledgerName: 'Software Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 14210, drCr: 'Dr', notes: 'Zoom ₹6,495 + Tally ₹7,216 + Canva ₹500' },
    
    // Staff payments (non-director)
    { ...base, ledgerName: 'Staff Payments', parentGroup: 'Employee Expenses', category: 'expense', amount: 33386, drCr: 'Dr', notes: 'Lagad Abhay ₹32,124 + Karuna ₹1,262 — class organizers' },
    
    // Bank charges
    { ...base, ledgerName: 'Bank Charges', parentGroup: 'Admin Expenses', category: 'expense', amount: 536, drCr: 'Dr', notes: 'IMPS charges + annual fee from bank statement' },
    
    // EMI / Loan Interest (MacBook)
    { ...base, ledgerName: 'MacBook EMI', parentGroup: 'Admin Expenses', category: 'expense', amount: 10500, drCr: 'Dr', notes: 'MacBook EMI from bank statement' },
    
    // L&T Financial (Upamanyu laptop EMI)
    { ...base, ledgerName: 'Laptop EMI (L&T Finance)', parentGroup: 'Admin Expenses', category: 'expense', amount: 12990, drCr: 'Dr', notes: 'L&T Financial Services EMI — ₹6,495 × 2 payments' },
    
    // Food & Hospitality (class-related)
    { ...base, ledgerName: 'Food & Hospitality', parentGroup: 'Admin Expenses', category: 'expense', amount: 6591, drCr: 'Dr', notes: 'Zomato + Hotel + Food — class-related from bank' },
    
    // Miscellaneous (remaining uncategorized)
    { ...base, ledgerName: 'Miscellaneous Expenses', parentGroup: 'Admin Expenses', category: 'expense', amount: 97967, drCr: 'Dr', notes: 'Remaining uncategorized bank statement expenses' },
  );
  
  // ════════════════════════════════════════════════════════════════
  // INCOME
  // ════════════════════════════════════════════════════════════════
  const incomeEntries = [
    { ...base, ledgerName: 'Course Fees', parentGroup: 'Revenue from Operations', category: 'income', amount: 1079287, drCr: 'Cr', notes: 'Course fees from Razorpay + UPI' },
    { ...base, ledgerName: 'Other Income', parentGroup: 'Other Income', category: 'income', amount: 0, drCr: 'Cr', notes: 'Bank interest etc.' },
  ];
  
  // ════════════════════════════════════════════════════════════════
  // LIABILITIES
  // ════════════════════════════════════════════════════════════════
  const liabilityEntries = [
    { ...base, ledgerName: 'Equity Share Capital', parentGroup: 'Share Capital', category: 'liability', amount: 100000, drCr: 'Cr', notes: '10,000 shares × ₹10' },
    { ...base, ledgerName: 'Preference Share Capital', parentGroup: 'Share Capital', category: 'liability', amount: 510000, drCr: 'Cr', notes: 'Preference shares' },
    { ...base, ledgerName: 'Unsecured Loans (Investments Received)', parentGroup: 'Current Liabilities', category: 'liability', amount: 636005, drCr: 'Cr', notes: 'INVESTMENT entries from bank — Prashant, Dipesh, Minakshi, Manidar Kaur etc. — classified as unsecured loans' },
    { ...base, ledgerName: 'Sundry Advances (Received)', parentGroup: 'Current Liabilities', category: 'liability', amount: 325000, drCr: 'Cr', notes: 'OCL carried forward from FY 2023-24' },
    { ...base, ledgerName: 'Audit Fees Payable', parentGroup: 'Current Liabilities', category: 'liability', amount: 5000, drCr: 'Cr', notes: 'Outstanding audit fees' },
    { ...base, ledgerName: 'Consulting Fees Payable', parentGroup: 'Current Liabilities', category: 'liability', amount: 2500, drCr: 'Cr', notes: 'Outstanding consulting fees' },
    { ...base, ledgerName: 'Deferred Tax Liability (Net)', parentGroup: 'Non-Current Liabilities', category: 'liability', amount: 30493, drCr: 'Dr', notes: 'DTA from FY 2023-24' },
    {
      ...base,
      ledgerName: 'Profit & Loss Account',
      parentGroup: 'Reserves & Surplus',
      category: 'liability',
      amount: 45192,
      drCr: 'Dr',
      notes: 'Opening P&L loss carried forward from FY 2023-24',
    },
    // Dividends paid: ₹47,100 — appropriation from Reserves (reduces equity)
    {
      ...base,
      ledgerName: 'Dividends Paid',
      parentGroup: 'Reserves & Surplus',
      category: 'liability',
      amount: 47100,
      drCr: 'Dr',
      notes: 'Dividends paid during FY 2024-25 — appropriation from reserves',
    },
  ];
  
  // ── Compute totals ──
  const allEntries = [...assetEntries, ...expenseEntries, ...incomeEntries, ...liabilityEntries];
  
  // Calculate P&L
  const totalIncome = incomeEntries.reduce((s, e) => s + (e.drCr === 'Cr' ? e.amount : -e.amount), 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  
  // Calculate BS
  const totalAssets = assetEntries.reduce((s, e) => s + e.amount, 0);
  
  // Liabilities: Cr = positive, Dr = negative
  const totalLiabilities = liabilityEntries.reduce((s, e) => {
    return s + (e.drCr === 'Cr' ? e.amount : -e.amount);
  }, 0);
  
  // BS should balance: Assets = Liabilities + Reserves (P&L) + Net Profit
  // or: Assets = Total Equity + Liabilities
  // totalLiabilities already includes opening P&L loss (Dr, negative) and dividends (Dr, negative)
  
  console.log('════════════════════════════════════════════════');
  console.log('  P&L SUMMARY');
  console.log('════════════════════════════════════════════════');
  console.log(`  Income:     ₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`  Expenses:   ₹${totalExpenses.toLocaleString('en-IN')}`);
  console.log(`  Net Profit: ₹${netProfit.toLocaleString('en-IN')}`);
  console.log(`  (of which Depreciation: ₹${totalDepreciation.toLocaleString('en-IN')})`);
  
  console.log('\n════════════════════════════════════════════════');
  console.log('  BALANCE SHEET SUMMARY');
  console.log('════════════════════════════════════════════════');
  console.log(`  Total Assets:              ₹${totalAssets.toLocaleString('en-IN')}`);
  console.log(`  Total Equity+Liabilities:  ₹${totalLiabilities.toLocaleString('en-IN')}`);
  console.log(`  + Net Profit this year:    ₹${netProfit.toLocaleString('en-IN')}`);
  console.log(`  = E+L+Profit:              ₹${(totalLiabilities + netProfit).toLocaleString('en-IN')}`);
  console.log(`  BS Gap:                    ₹${(totalAssets - totalLiabilities - netProfit).toLocaleString('en-IN')}`);
  
  console.log('\n  ASSET DETAIL:');
  assetEntries.forEach(e => console.log(`    ${e.ledgerName.padEnd(40)} ₹${e.amount.toLocaleString('en-IN').padStart(10)}`));
  
  console.log('\n  LIABILITY DETAIL:');
  liabilityEntries.forEach(e => {
    const sign = e.drCr === 'Cr' ? '' : '-';
    console.log(`    ${e.ledgerName.padEnd(40)} ${sign}₹${e.amount.toLocaleString('en-IN').padStart(10)}`);
  });
  
  console.log('\n  EXPENSE DETAIL:');
  expenseEntries.forEach(e => console.log(`    ${e.ledgerName.padEnd(40)} ₹${e.amount.toLocaleString('en-IN').padStart(10)}`));
  
  // ── Step 4: Insert all entries ──
  const insertResult = await balCol.insertMany(allEntries);
  console.log(`\n✅ Inserted ${insertResult.insertedCount} entries for FY 2024-25`);
  
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
