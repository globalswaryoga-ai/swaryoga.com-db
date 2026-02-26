/**
 * Compare FY 2023-24 DB entries with CA Report and show differences
 * Run: node scripts/compare-ca-report.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const H = 100;

// Exact CA report numbers (in "Rs. in Hundred")
const caReport = {
  income: [
    { ledger: 'Course Fees', caAmt: 7035.70 * H },
    { ledger: 'Other Income', caAmt: 201.52 * H },
  ],
  expense: [
    { ledger: 'Depreciation - Computer', caAmt: 2395.16 * H },
    { ledger: 'Depreciation - Furniture & Fixture', caAmt: 108.98 * H },
    { ledger: 'Depreciation - Software', caAmt: 113.69 * H },
    { ledger: 'Depreciation - Machinery & Equipment', caAmt: 107.43 * H },
    { ledger: 'Depreciation - JBL Speaker', caAmt: 16.53 * H },
    { ledger: 'Depreciation - Mobile', caAmt: 72.02 * H },
    { ledger: 'Bank Charges & Commission', caAmt: 0.41 * H },
    { ledger: 'Office Rent', caAmt: 525.00 * H },
    { ledger: 'Advertisement Expenses', caAmt: 259.00 * H },
    { ledger: 'Electricity Expenses', caAmt: 88.05 * H },
    { ledger: 'Office Expenses', caAmt: 281.22 * H },
    { ledger: 'Class Expenses', caAmt: 711.80 * H },
    { ledger: 'Training Expenses', caAmt: 86.60 * H },
    { ledger: 'Internet & Mobile Expenses', caAmt: 267.98 * H },
    { ledger: 'Printing & Stationery', caAmt: 176.50 * H },
    { ledger: 'Professional Fees', caAmt: 363.00 * H },
    { ledger: 'ROC Fees', caAmt: 1.00 * H },
    { ledger: 'SA Tax Paid', caAmt: 11.80 * H },
    { ledger: 'Travelling Expenses', caAmt: 700.80 * H },
    { ledger: 'Teachers Fees', caAmt: 1744.81 * H },
  ],
  asset: [
    { ledger: 'Fixed Assets (Net Block)', caAmt: 3977.19 * H, drCr: 'Dr' },
    { ledger: 'Cash & Cash Equivalents', caAmt: 3293.27 * H, drCr: 'Dr' },
    { ledger: 'Other Current Assets', caAmt: 1397.69 * H, drCr: 'Dr' },
  ],
  liability: [
    { ledger: 'Share Capital', caAmt: 6100.00 * H, drCr: 'Cr' },
    { ledger: 'Reserves & Surplus', caAmt: 451.92 * H, drCr: 'Dr' },
    { ledger: 'Deferred Tax Liability', caAmt: 304.93 * H, drCr: 'Dr' },
    { ledger: 'Short-Term Provisions', caAmt: 75.00 * H, drCr: 'Cr' },
    { ledger: 'Other Current Liabilities', caAmt: 3250.00 * H, drCr: 'Cr' },
  ],
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  const balances = await coll.find({ financialYear: '2023-24' }).toArray();
  
  console.log('═'.repeat(80));
  console.log('  FY 2023-24: DB vs CA Report Comparison');
  console.log('═'.repeat(80));
  
  let hasDiff = false;
  
  for (const cat of ['income', 'expense', 'asset', 'liability']) {
    console.log(`\n  ── ${cat.toUpperCase()} ──`);
    for (const caItem of caReport[cat]) {
      const caAmt = Math.round(caItem.caAmt * 100) / 100;
      const dbEntry = balances.find(b => b.ledgerName === caItem.ledger && b.category === cat);
      const dbAmt = dbEntry ? dbEntry.amount : 0;
      const diff = Math.round((dbAmt - caAmt) * 100) / 100;
      
      const status = diff === 0 ? '✅' : '❌';
      if (diff !== 0) hasDiff = true;
      
      console.log(`  ${status} ${caItem.ledger.padEnd(42)} DB: ₹${dbAmt.toLocaleString('en-IN').padStart(10)} | CA: ₹${caAmt.toLocaleString('en-IN').padStart(10)} | Diff: ₹${diff.toLocaleString('en-IN')}`);
    }
  }
  
  // Check for DB entries not in CA report
  console.log(`\n  ── EXTRA ENTRIES IN DB (not in CA report) ──`);
  const allCaLedgers = Object.values(caReport).flat().map(x => x.ledger);
  const extraEntries = balances.filter(b => !allCaLedgers.includes(b.ledgerName));
  if (extraEntries.length === 0) {
    console.log('  None ✅');
  } else {
    hasDiff = true;
    extraEntries.forEach(e => {
      console.log(`  ❌ ${e.ledgerName} | ${e.category} | ${e.drCr} | ₹${e.amount}`);
    });
  }
  
  // Summary
  let incDB = 0, expDB = 0, astDB = 0, libDB = 0;
  let incCA = 0, expCA = 0, astCA = 0, libCA = 0;
  
  balances.forEach(b => {
    if (b.category === 'income') incDB += b.amount;
    if (b.category === 'expense') expDB += b.amount;
    if (b.category === 'asset') astDB += (b.drCr === 'Cr' ? -b.amount : b.amount);
    if (b.category === 'liability') libDB += (b.drCr === 'Dr' ? -b.amount : b.amount);
  });
  
  caReport.income.forEach(c => incCA += c.caAmt);
  caReport.expense.forEach(c => expCA += c.caAmt);
  caReport.asset.forEach(c => astCA += (c.drCr === 'Cr' ? -c.caAmt : c.caAmt));
  caReport.liability.forEach(c => libCA += (c.drCr === 'Cr' ? c.caAmt : -c.caAmt));
  
  // Round
  incCA = Math.round(incCA * 100) / 100;
  expCA = Math.round(expCA * 100) / 100;
  astCA = Math.round(astCA * 100) / 100;
  libCA = Math.round(libCA * 100) / 100;
  
  console.log('\n' + '═'.repeat(80));
  console.log('  TOTALS COMPARISON');
  console.log('═'.repeat(80));
  console.log(`  Income:     DB ₹${incDB.toLocaleString('en-IN').padStart(10)} | CA ₹${incCA.toLocaleString('en-IN').padStart(10)} | Diff: ₹${(incDB-incCA).toLocaleString('en-IN')}`);
  console.log(`  Expenses:   DB ₹${expDB.toLocaleString('en-IN').padStart(10)} | CA ₹${expCA.toLocaleString('en-IN').padStart(10)} | Diff: ₹${(expDB-expCA).toLocaleString('en-IN')}`);
  console.log(`  Assets:     DB ₹${astDB.toLocaleString('en-IN').padStart(10)} | CA ₹${astCA.toLocaleString('en-IN').padStart(10)} | Diff: ₹${(astDB-astCA).toLocaleString('en-IN')}`);
  console.log(`  Equity+Lib: DB ₹${libDB.toLocaleString('en-IN').padStart(10)} | CA ₹${libCA.toLocaleString('en-IN').padStart(10)} | Diff: ₹${(libDB-libCA).toLocaleString('en-IN')}`);
  console.log(`\n  BS Balance: DB Assets-Liab = ₹${(astDB-libDB).toLocaleString('en-IN')} | CA Assets-Liab = ₹${(astCA-libCA).toLocaleString('en-IN')}`);
  
  console.log('\n' + (hasDiff ? '⚠️  DIFFERENCES FOUND — needs correction' : '✅ ALL ENTRIES MATCH CA REPORT EXACTLY'));
  
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
