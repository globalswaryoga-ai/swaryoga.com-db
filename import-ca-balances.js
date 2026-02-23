/**
 * Import CA Report Data into Manual Balances (FY 2023-24)
 * Source: CA Vijay Kenchugundi & Associates — Statutory Audit Report
 * Company: Upamnyu International Education Private Limited
 * Balance Sheet as on 31st March, 2024
 * P&L for year ended 31st March, 2024
 * 
 * ALL figures in CA report are in "Rs. In Hundred" — multiplied by 100 here for actual INR.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const FY = '2023-24';
const AS_ON = '31-03-2024';
const H = 100; // multiplier: Rs. In Hundred → actual INR

// ============================================================================
// BALANCE SHEET — EQUITY & LIABILITIES
// ============================================================================
const balanceSheetEntries = [
  // ── Share Capital (Note 1) ──
  { ledgerName: 'Equity Share Capital',        parentGroup: 'Share Capital',              category: 'liability', amount: 1000.00 * H,   drCr: 'Cr', notes: 'Note 1: 10,000 equity shares @ Rs.10/- each' },
  { ledgerName: 'Preference Share Capital',    parentGroup: 'Share Capital',              category: 'liability', amount: 5100.00 * H,   drCr: 'Cr', notes: 'Note 1: 51,000 pref shares @ Rs.10/- each, 14% redeemable' },

  // ── Reserves and Surplus (Note 2) ──
  { ledgerName: 'Profit & Loss Account',       parentGroup: 'Reserves & Surplus',         category: 'liability', amount: 451.92 * H,    drCr: 'Dr', notes: 'Note 2: Opening 37.71(H), Add Loss -489.63(H) = -451.92(H). Debit balance.' },

  // ── Non-Current Liabilities ──
  { ledgerName: 'Deferred Tax Liability (Net)', parentGroup: 'Non-Current Liabilities',   category: 'liability', amount: 304.93 * H,    drCr: 'Dr', notes: 'Note 4: Actually DTA. Dep per IT 1641.22(H) < Dep per Co Act 2813.81(H). DTL @ 26% = -304.93(H). Shown as deduction on Liabilities side.' },

  // ── Current Liabilities — Short Term Provisions (Note 5) ──
  { ledgerName: 'Audit Fees Payable',          parentGroup: 'Current Liabilities',        category: 'liability', amount: 50.00 * H,     drCr: 'Cr', notes: 'Note 5: Provision for audit fees' },
  { ledgerName: 'Consulting Fees Payable',     parentGroup: 'Current Liabilities',        category: 'liability', amount: 25.00 * H,     drCr: 'Cr', notes: 'Note 5: Provision for consulting fees' },

  // ── Current Liabilities — Other Current Liabilities (Note 6) ──
  { ledgerName: 'Sundry Advances (Received)',  parentGroup: 'Current Liabilities',        category: 'liability', amount: 3250.00 * H,   drCr: 'Cr', notes: 'Note 6: Sundry advances received. Previous year: Directors advances 4,751(H)' },

  // ── ASSETS — Fixed Assets (Note 7 / Schedule from 2.pdf) ──
  { ledgerName: 'Computer',                   parentGroup: 'Fixed Assets',               category: 'asset',     amount: 2424.83 * H,   drCr: 'Dr', notes: 'WDV as on 31-03-2024. Gross: part of 6,791(H) block' },
  { ledgerName: 'Furniture and Fixture',       parentGroup: 'Fixed Assets',               category: 'asset',     amount: 312.02 * H,    drCr: 'Dr', notes: 'WDV as on 31-03-2024' },
  { ledgerName: 'Software',                   parentGroup: 'Fixed Assets',               category: 'asset',     amount: 66.31 * H,     drCr: 'Dr', notes: 'WDV as on 31-03-2024' },
  { ledgerName: 'Machinery & Equipment',       parentGroup: 'Fixed Assets',               category: 'asset',     amount: 307.57 * H,    drCr: 'Dr', notes: 'WDV as on 31-03-2024' },
  { ledgerName: 'JBL Speaker',                parentGroup: 'Fixed Assets',               category: 'asset',     amount: 258.47 * H,    drCr: 'Dr', notes: 'WDV as on 31-03-2024' },
  { ledgerName: 'Mobile',                     parentGroup: 'Fixed Assets',               category: 'asset',     amount: 607.99 * H,    drCr: 'Dr', notes: 'WDV as on 31-03-2024' },

  // ── ASSETS — Cash & Cash Equivalents (Note 9) ──
  { ledgerName: 'Cash in Hand',               parentGroup: 'Cash & Cash Equivalents',    category: 'asset',     amount: 2918.86 * H,   drCr: 'Dr', notes: 'Note 9: Cash balance' },
  { ledgerName: 'Kotak Mahindra Bank A/C',     parentGroup: 'Bank Accounts',              category: 'asset',     amount: 374.41 * H,    drCr: 'Dr', notes: 'Note 9: Current bank account balance' },

  // ── ASSETS — Other Current Assets (Note 10) ──
  { ledgerName: 'Fees Receivable',             parentGroup: 'Current Assets',             category: 'asset',     amount: 1117.69 * H,   drCr: 'Dr', notes: 'Note 10: Outstanding fees receivable' },
  { ledgerName: 'Sundry Advances (Paid)',      parentGroup: 'Current Assets',             category: 'asset',     amount: 280.00 * H,    drCr: 'Dr', notes: 'Note 10: Advances paid' },
];

// ============================================================================
// PROFIT & LOSS — Income & Expenses (for year ended 31-03-2024)
// ============================================================================
const plEntries = [
  // ── Income ──
  { ledgerName: 'Course Fees',                parentGroup: 'Revenue from Operations',    category: 'income',    amount: 7035.70 * H,   drCr: 'Cr', notes: 'Note 11: Sale of services — course fees' },
  { ledgerName: 'Other Income',               parentGroup: 'Other Income',               category: 'income',    amount: 201.52 * H,    drCr: 'Cr', notes: 'Note 12: Other income' },

  // ── Depreciation & Amortisation (Note 15) ──
  { ledgerName: 'Depreciation - Computer',     parentGroup: 'Depreciation',               category: 'expense',   amount: 2395.16 * H,   drCr: 'Dr', notes: 'Note 15: Depreciation on computer' },
  { ledgerName: 'Depreciation - Furniture',    parentGroup: 'Depreciation',               category: 'expense',   amount: 108.98 * H,    drCr: 'Dr', notes: 'Note 15: Depreciation on furniture & fixture' },
  { ledgerName: 'Depreciation - Software',     parentGroup: 'Depreciation',               category: 'expense',   amount: 113.69 * H,    drCr: 'Dr', notes: 'Note 15: Depreciation on software' },
  { ledgerName: 'Depreciation - Machinery',    parentGroup: 'Depreciation',               category: 'expense',   amount: 107.43 * H,    drCr: 'Dr', notes: 'Note 15: Depreciation on machinery & equipment' },
  { ledgerName: 'Depreciation - JBL Speaker',  parentGroup: 'Depreciation',               category: 'expense',   amount: 16.53 * H,     drCr: 'Dr', notes: 'Note 15: Depreciation on JBL speaker' },
  { ledgerName: 'Depreciation - Mobile',       parentGroup: 'Depreciation',               category: 'expense',   amount: 72.02 * H,     drCr: 'Dr', notes: 'Note 15: Depreciation on mobile' },

  // ── Administration & Other Expenses (Note 16) ──
  { ledgerName: 'Bank Charges',               parentGroup: 'Admin Expenses',             category: 'expense',   amount: 0.41 * H,      drCr: 'Dr', notes: 'Note 16: Bank charges & commission' },
  { ledgerName: 'Office Rent',                parentGroup: 'Admin Expenses',             category: 'expense',   amount: 525.00 * H,    drCr: 'Dr', notes: 'Note 16: Office rent' },
  { ledgerName: 'Advertisement Expenses',     parentGroup: 'Admin Expenses',             category: 'expense',   amount: 259.00 * H,    drCr: 'Dr', notes: 'Note 16: Advertisement expenses' },
  { ledgerName: 'Electricity Expenses',       parentGroup: 'Admin Expenses',             category: 'expense',   amount: 88.05 * H,     drCr: 'Dr', notes: 'Note 16: Electricity expenses' },
  { ledgerName: 'Office Expenses',            parentGroup: 'Admin Expenses',             category: 'expense',   amount: 281.22 * H,    drCr: 'Dr', notes: 'Note 16: Office expenses' },
  { ledgerName: 'Class Expenses',             parentGroup: 'Admin Expenses',             category: 'expense',   amount: 711.80 * H,    drCr: 'Dr', notes: 'Note 16: Class expenses' },
  { ledgerName: 'Training Expenses',          parentGroup: 'Admin Expenses',             category: 'expense',   amount: 86.60 * H,     drCr: 'Dr', notes: 'Note 16: Training expenses' },
  { ledgerName: 'Internet & Mobile Expenses', parentGroup: 'Admin Expenses',             category: 'expense',   amount: 267.98 * H,    drCr: 'Dr', notes: 'Note 16: Internet and mobile expenses' },
  { ledgerName: 'Printing & Stationery',      parentGroup: 'Admin Expenses',             category: 'expense',   amount: 176.50 * H,    drCr: 'Dr', notes: 'Note 16: Printing and stationery' },
  { ledgerName: 'Professional Fees',          parentGroup: 'Admin Expenses',             category: 'expense',   amount: 363.00 * H,    drCr: 'Dr', notes: 'Note 16: Professional fees' },
  { ledgerName: 'ROC Fees',                   parentGroup: 'Admin Expenses',             category: 'expense',   amount: 1.00 * H,      drCr: 'Dr', notes: 'Note 16: Registrar of Companies fees' },
  { ledgerName: 'SA Tax Paid',                parentGroup: 'Admin Expenses',             category: 'expense',   amount: 11.80 * H,     drCr: 'Dr', notes: 'Note 16: Self-assessment tax paid' },
  { ledgerName: 'Travelling Expenses',        parentGroup: 'Admin Expenses',             category: 'expense',   amount: 700.80 * H,    drCr: 'Dr', notes: 'Note 16: Travelling expenses' },
  { ledgerName: 'Teachers Fees',              parentGroup: 'Admin Expenses',             category: 'expense',   amount: 1744.81 * H,   drCr: 'Dr', notes: 'Note 16: Teachers fees' },

  // ── Tax ──
  { ledgerName: 'Deferred Tax (P&L)',          parentGroup: 'Tax',                        category: 'expense',   amount: 304.93 * H,    drCr: 'Cr', notes: 'Tax credit/benefit due to DTA. Reduces loss from -794.56(H) to -489.63(H).' },
];

const allEntries = [...balanceSheetEntries, ...plEntries];

// ============================================================================
// Verification before insert
// ============================================================================
function verify() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  VERIFICATION — CA Report Data (FY 2023-24)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Balance Sheet check
  const bsEntries = allEntries.filter(e => ['asset', 'liability'].includes(e.category));
  
  let totalAssetsDr = 0, totalLiabilitiesCr = 0, totalLiabilitiesDr = 0;
  bsEntries.forEach(e => {
    if (e.category === 'asset') totalAssetsDr += e.amount;
    else if (e.drCr === 'Cr') totalLiabilitiesCr += e.amount;
    else totalLiabilitiesDr += e.amount; // Dr entries on liability side (negative reserves, DTA)
  });

  const netLiabilities = totalLiabilitiesCr - totalLiabilitiesDr;
  console.log('BALANCE SHEET:');
  console.log(`  Total Assets (Dr):     ₹${totalAssetsDr.toLocaleString('en-IN')}`);
  console.log(`  Liabilities (Cr):      ₹${totalLiabilitiesCr.toLocaleString('en-IN')}`);
  console.log(`  Liabilities (Dr adj):  ₹${totalLiabilitiesDr.toLocaleString('en-IN')}`);
  console.log(`  Net Liabilities:       ₹${netLiabilities.toLocaleString('en-IN')}`);
  console.log(`  Balance Check:         ${Math.abs(totalAssetsDr - netLiabilities) < 1 ? '✅ BALANCED' : '❌ MISMATCH of ₹' + Math.abs(totalAssetsDr - netLiabilities)}\n`);

  // P&L check
  const plItems = allEntries.filter(e => ['income', 'expense'].includes(e.category));
  let totalIncome = 0, totalExpensesDr = 0, totalExpensesCr = 0;
  plItems.forEach(e => {
    if (e.category === 'income') totalIncome += e.amount;
    else if (e.drCr === 'Dr') totalExpensesDr += e.amount;
    else totalExpensesCr += e.amount; // Cr entries on expense side (deferred tax credit)
  });

  const netExpenses = totalExpensesDr - totalExpensesCr;
  const netPL = totalIncome - netExpenses;
  console.log('PROFIT & LOSS:');
  console.log(`  Total Income:          ₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`  Total Expenses (Dr):   ₹${totalExpensesDr.toLocaleString('en-IN')}`);
  console.log(`  Tax Credit (Cr):       ₹${totalExpensesCr.toLocaleString('en-IN')}`);
  console.log(`  Net Expenses:          ₹${netExpenses.toLocaleString('en-IN')}`);
  console.log(`  Net Profit/(Loss):     ₹${netPL.toLocaleString('en-IN')}`);
  
  const expectedLoss = -489.63 * H;
  console.log(`  Expected (CA Report):  ₹${expectedLoss.toLocaleString('en-IN')}`);
  console.log(`  P&L Check:             ${Math.abs(netPL - expectedLoss) < 1 ? '✅ MATCHES CA REPORT' : '❌ MISMATCH of ₹' + Math.abs(netPL - expectedLoss)}\n`);

  console.log(`Total entries: ${allEntries.length} (${bsEntries.length} BS + ${plItems.length} P&L)\n`);
  
  return Math.abs(totalAssetsDr - netLiabilities) < 1 && Math.abs(netPL - expectedLoss) < 1;
}

// ============================================================================
// MongoDB Insert
// ============================================================================
async function importToMongo() {
  const ok = verify();
  if (!ok) {
    console.error('❌ Verification failed! Fix data before importing.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');
  
  // Check for existing data
  const existing = await col.countDocuments({ financialYear: FY });
  if (existing > 0) {
    console.log(`⚠️  Found ${existing} existing entries for FY ${FY}. Deleting first...`);
    await col.deleteMany({ financialYear: FY });
    console.log('   Deleted.');
  }

  // Prepare documents
  const docs = allEntries.map(e => ({
    ...e,
    financialYear: FY,
    asOnDate: AS_ON,
    createdBy: 'ca-report-import',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await col.insertMany(docs);
  console.log(`✅ Inserted ${result.insertedCount} entries for FY ${FY}`);

  // Summary
  const summary = await col.aggregate([
    { $match: { financialYear: FY } },
    { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ]).toArray();
  console.log('\nSummary by category:');
  summary.forEach(s => console.log(`  ${s._id}: ${s.count} entries, total ₹${s.total.toLocaleString('en-IN')}`));

  await mongoose.disconnect();
}

importToMongo().catch(e => { console.error(e); process.exit(1); });
