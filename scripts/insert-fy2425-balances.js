/**
 * Insert FY 2024-25 Income & Expense balance entries into tally_manual_balances
 * 
 * This script:
 * 1. Aggregates all Payment vouchers by party name into expense categories
 * 2. Aggregates all Receipt vouchers into income entries
 * 3. Inserts the results into tally_manual_balances collection
 * 
 * Run: node scripts/insert-fy2425-balances.js
 * Dry-run: DRY_RUN=1 node scripts/insert-fy2425-balances.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const FY = '2024-25';
const AS_ON_DATE = '31-03-2025';
const DRY_RUN = process.env.DRY_RUN === '1';

// ── EXPENSE MAPPING ──
// Maps payment voucher ledgerName or partyName (case-insensitive substring match) → category
const EXPENSE_MAP = {
  // ── Salaries (Director/Family) ──
  'director salary': 'Director Salary',
  'mohan kalburgi': 'Director Salary',
  'upamnyu kalburgi': 'Director Salary',
  'laxmi mohan kal': 'Director Salary',
  'turya mohan': 'Director Salary',

  // ── Staff Salary ──
  'staff salary': 'Staff Salary',
  'pandurang': 'Staff Salary',
  'shubham': 'Staff Salary',

  // ── Teacher Remuneration ──
  'teacher remuneration': 'Teacher Remuneration',
  'lagad abhay': 'Teacher Remuneration',
  
  // ── Rent & Utilities ──
  'rent': 'Rent',
  'electricity': 'Electricity Expenses',
  'light bill': 'Electricity Expenses',
  
  // ── Internet & Mobile ──
  'internet': 'Internet & Mobile Expenses',
  'mobile recharge': 'Internet & Mobile Expenses',
  'sumit anil att': 'Internet & Mobile Expenses',  // Net recharge
  
  // ── Office & Equipment ──
  'macbook emi': 'Macbook EMI',
  'macbook': 'Macbook EMI',
  'office expense': 'Office Expenses',
  'office exp': 'Office Expenses',   // abbreviated
  'comhard technol': 'Software & Subscriptions',
  'computer': 'Office Equipment',
  
  // ── Subscriptions & Software ──
  'subscription': 'Subscription Expenses',
  'google play': 'Subscription Expenses',
  'zvc india': 'Subscription Expenses',
  'domain': 'Subscription Expenses',
  'godaddy': 'Subscription Expenses',
  
  // ── Advertisement ──
  'advertisement': 'Advertisement Expenses',
  'google ads': 'Advertisement Expenses',
  'facebook ad': 'Advertisement Expenses',   // covers "facebook ads" & "facebook adv"
  
  // ── Professional Fees ──
  'professional fees': 'Professional Fees',
  'ca fee': 'Professional Fees',
  'maha vastu': 'Professional Fees',
  
  // ── Travel ──
  'travelling': 'Travelling Expenses',
  'redbus': 'Travelling Expenses',
  'msrtc': 'Travelling Expenses',
  
  // ── Vehicle & Fuel ──
  'petrol': 'Vehicle & Fuel Expenses',
  'disel': 'Vehicle & Fuel Expenses',
  'diesel': 'Vehicle & Fuel Expenses',
  'indian oil': 'Vehicle & Fuel Expenses',
  'reliance bp': 'Vehicle & Fuel Expenses',
  'car wash': 'Vehicle & Fuel Expenses',
  'car repair': 'Vehicle & Fuel Expenses',
  'car expense': 'Vehicle & Fuel Expenses',
  'car tape': 'Vehicle & Fuel Expenses',
  'tripple c car': 'Vehicle & Fuel Expenses',
  'hark khatri': 'Vehicle & Fuel Expenses',
  'newaskar automo': 'Vehicle & Fuel Expenses',
  'ameriya automo': 'Vehicle & Fuel Expenses',
  'mani motors': 'Vehicle & Fuel Expenses',
  'gurukrupa enter': 'Vehicle & Fuel Expenses',
  'abhang petr': 'Vehicle & Fuel Expenses',
  'patil highway': 'Vehicle & Fuel Expenses',
  'kakade patil pe': 'Vehicle & Fuel Expenses',
  'janseva di': 'Vehicle & Fuel Expenses',
  
  // ── Food & Refreshments ──
  'zomato': 'Food & Refreshments',
  'dominos': 'Food & Refreshments',
  'food': 'Food & Refreshments',
  'namaste': 'Food & Refreshments',
  'anand kulfi': 'Food & Refreshments',
  'galande snack': 'Food & Refreshments',
  'avenue supermar': 'Food & Refreshments',
  'shreeganeshhote': 'Food & Refreshments',
  'aishwarya filli': 'Food & Refreshments',
  'kailas flour mi': 'Food & Refreshments',
  'parivar kirana': 'Food & Refreshments',
  'shravan fu': 'Food & Refreshments',
  'gurudatta kiran': 'Food & Refreshments',
  'shri new siddhi': 'Food & Refreshments',
  'shri siddeshwar': 'Food & Refreshments',
  'arvind kalburgi': 'Food & Refreshments',
  'tapas das': 'Food & Refreshments',

  // ── Medical ──
  'medicin': 'Medical Expenses',
  'medical': 'Medical Expenses',
  
  // ── Class Expenses ──
  'class expense': 'Class Expenses',
  'class exp': 'Class Expenses',  // abbreviated
  'class dise': 'Class Expenses',
  'class organ': 'Class Expenses',
  'shreeramcorpora': 'Class Expenses',
  
  // ── Personal Expenses ──
  'personal expense': 'Personal Expenses',
  'personal exp': 'Personal Expenses',
  'swamini cosmeti': 'Personal Expenses',
  'archaeological': 'Personal Expenses',
  'smart point': 'Personal Expenses',
  'smart pune': 'Personal Expenses',
  
  // ── Printing & Stationery ──
  'printing': 'Printing & Stationery',
  'stationery': 'Printing & Stationery',
  'saptshrungi xer': 'Printing & Stationery',
  
  // ── Dividend ──
  'dividend': 'Dividend Paid',
  
  // ── Tax ──
  'tax expense': 'Tax Expenses',
  'tax / gst': 'Tax Expenses',
  'central board': 'Tax Expenses',
  
  // ── Other Expenses ──
  'other expense': 'Other Expenses',
  'other exp': 'Other Expenses',
  
  // ── Bank Charges ──
  'chrg:': 'Bank Charges',
  'debit card annual': 'Bank Charges',
  
  // ── Payment Gateway ──
  'razorpay': 'Payment Gateway Charges',
  
  // ── Investment/Advance ──
  'investment': 'Investments & Advances',
  'manjinder kaur': 'Investments & Advances',
  
  // ── Mobile/Equipment purchases ──
  'mobile-one plus': 'Office Equipment',
  
  // ── Misc individual payments ──
  'phonepe': 'Other Expenses',
  'dheeraj nanasah': 'Other Expenses',
  'shree ganesha a': 'Other Expenses',
  'rajesh ramchand': 'Other Expenses',
  'rahul dashrath': 'Other Expenses',
  'kirankumar bhas': 'Other Expenses',
  'nanda kantilal': 'Other Expenses',
  'sahakarmaharshi': 'Other Expenses',
  'sunil maharanid': 'Other Expenses',
  'amazon seller': 'Office Expenses',
  'abdul majid': 'Other Expenses',
  'mahadeo sharana': 'Other Expenses',
  'akshay ganga': 'Other Expenses',
  'sachin laxman': 'Other Expenses',
  'vijay shesharao': 'Other Expenses',
  'pravin machhind': 'Other Expenses',
  'megha malani': 'Other Expenses',
  'nitin suresh': 'Other Expenses',
  'saurabh sum': 'Other Expenses',
  'sangamner taluk': 'Other Expenses',
  'ajay nankram': 'Other Expenses',
  'karuna ch': 'Other Expenses',
  'kortikar nilam': 'Other Expenses',
  'rajendra bhaska': 'Other Expenses',
  'shree gopalkrus': 'Other Expenses',
  'vikas shetty': 'Other Expenses',
  'ankur ukey': 'Other Expenses',
  'ibul islam': 'Other Expenses',
  'ghawate shashik': 'Other Expenses',
  'sivan govindara': 'Other Expenses',
  'kishor ravindra': 'Other Expenses',
  'shailesh su': 'Other Expenses',
  'mandar tulshida': 'Other Expenses',
  'sardar amin': 'Other Expenses',
  'prajwal lahu': 'Other Expenses',
  'sarvodaya nagar': 'Other Expenses',
  'irfan sharfuddi': 'Other Expenses',
  'tarunkumar mano': 'Other Expenses',
  'mayuresh madhuk': 'Other Expenses',
  'santosh piraji': 'Other Expenses',
  'rajesh pandhari': 'Other Expenses',
  'govind jayar': 'Other Expenses',
  'bhamabai raghu': 'Other Expenses',
  'mahesh anil': 'Other Expenses',
  'kedarnath badri': 'Other Expenses',
  'yash traders': 'Office Expenses',
  'shaikh liyakhat': 'Other Expenses',
  'ramesh shivram': 'Other Expenses',
  'ganesh kashinat': 'Other Expenses',
  's b divekar': 'Other Expenses',
  'shree mahankali': 'Other Expenses',
  'anil multi': 'Other Expenses',
  'ranjit kumar': 'Food & Refreshments',
  'rahul ramnath': 'Vehicle & Fuel Expenses',   // car tape
  'shravan fruit': 'Food & Refreshments',        // fruit market
};

// Parent group mapping for each ledger
const PARENT_GROUPS = {
  'Director Salary': 'Admin Expenses',
  'Staff Salary': 'Admin Expenses',
  'Teacher Remuneration': 'Admin Expenses',
  'Rent': 'Admin Expenses',
  'Electricity Expenses': 'Admin Expenses',
  'Internet & Mobile Expenses': 'Admin Expenses',
  'Macbook EMI': 'Admin Expenses',
  'Office Expenses': 'Admin Expenses',
  'Software & Subscriptions': 'Admin Expenses',
  'Subscription Expenses': 'Admin Expenses',
  'Advertisement Expenses': 'Admin Expenses',
  'Professional Fees': 'Admin Expenses',
  'Travelling Expenses': 'Admin Expenses',
  'Vehicle & Fuel Expenses': 'Admin Expenses',
  'Food & Refreshments': 'Admin Expenses',
  'Medical Expenses': 'Admin Expenses',
  'Class Expenses': 'Admin Expenses',
  'Personal Expenses': 'Admin Expenses',
  'Printing & Stationery': 'Admin Expenses',
  'Dividend Paid': 'Admin Expenses',
  'Tax Expenses': 'Admin Expenses',
  'Other Expenses': 'Admin Expenses',
  'Bank Charges': 'Admin Expenses',
  'Payment Gateway Charges': 'Admin Expenses',
  'Investments & Advances': 'Current Assets',
  'Office Equipment': 'Fixed Assets',
  // Income
  'Course Fees': 'Direct Income',
  'Course Fees (Cash)': 'Direct Income',
};

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FY ${FY} BALANCE ENTRY INSERTION${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`${'═'.repeat(60)}\n`);

  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db;
  const vouchersColl = db.collection('tally_manual_vouchers');
  const balancesColl = db.collection('tally_manual_balances');

  // Check for existing entries
  const existingCount = await balancesColl.countDocuments({ financialYear: FY });
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing entries for FY ${FY}.`);
    console.log('   Delete them first if you want to regenerate.\n');
    // Don't abort — we'll skip insertion but still show what would be inserted
  }

  // ── Aggregate Payments ──
  const payments = await vouchersColl.find({
    financialYear: FY,
    voucherType: 'Payment'
  }).toArray();

  console.log(`Found ${payments.length} Payment vouchers\n`);

  // Categorize each payment
  const ledgerTotals = {};
  let unmatchedTotal = 0;
  const unmatchedParties = [];

  for (const p of payments) {
    const party = (p.partyName || '').toString();
    const partyLower = party.toLowerCase();
    const ledger = (p.ledgerName || '').toString();
    const ledgerLower = ledger.toLowerCase();
    const amt = Math.abs(p.amount || 0);

    let matched = false;

    // First try: exact ledger match from existing mapped categories
    for (const [keyword, ledgerName] of Object.entries(EXPENSE_MAP)) {
      if (ledgerLower.includes(keyword) || partyLower.includes(keyword)) {
        ledgerTotals[ledgerName] = (ledgerTotals[ledgerName] || 0) + amt;
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatchedTotal += amt;
      unmatchedParties.push({ party, ledger, amount: amt });
    }
  }

  // ── Aggregate Receipts ──
  const receipts = await vouchersColl.find({
    financialYear: FY,
    voucherType: 'Receipt'
  }).toArray();

  let courseFeesBankTotal = 0;
  let courseFeesCashTotal = 0;

  for (const r of receipts) {
    const amt = Math.abs(r.amount || 0);
    const mode = (r.paymentMode || '').toLowerCase();
    if (mode === 'cash') {
      courseFeesCashTotal += amt;
    } else {
      courseFeesBankTotal += amt;
    }
  }

  // ── Show results ──
  console.log('── EXPENSE CATEGORIES ──');
  const sortedExpenses = Object.entries(ledgerTotals).sort((a, b) => b[1] - a[1]);
  let totalExpenses = 0;
  for (const [name, amt] of sortedExpenses) {
    const parentGroup = PARENT_GROUPS[name] || 'Admin Expenses';
    const category = (name === 'Investments & Advances' || name === 'Office Equipment') ? 'asset' : 'expense';
    console.log(`  ${name.padEnd(35)} | ${parentGroup.padEnd(18)} | ${category.padEnd(8)} | ₹${amt.toLocaleString('en-IN').padStart(10)}`);
    totalExpenses += amt;
  }
  console.log(`  ${'TOTAL'.padEnd(35)} |                    |          | ₹${totalExpenses.toLocaleString('en-IN').padStart(10)}`);

  if (unmatchedParties.length > 0) {
    console.log(`\n  ⚠️  UNMATCHED: ${unmatchedParties.length} parties, ₹${unmatchedTotal.toLocaleString('en-IN')}`);
    // Add unmatched to "Other Expenses"
    ledgerTotals['Other Expenses'] = (ledgerTotals['Other Expenses'] || 0) + unmatchedTotal;
    console.log(`  → Added to "Other Expenses"\n`);
    for (const p of unmatchedParties) {
      console.log(`     ${p.party.substring(0, 50).padEnd(50)} | ₹${p.amount.toLocaleString('en-IN').padStart(8)}`);
    }
  }

  console.log(`\n── INCOME ──`);
  console.log(`  Course Fees (Bank)  : ₹${courseFeesBankTotal.toLocaleString('en-IN')}`);
  console.log(`  Course Fees (Cash)  : ₹${courseFeesCashTotal.toLocaleString('en-IN')}`);
  const totalIncome = courseFeesBankTotal + courseFeesCashTotal;
  console.log(`  Total Income        : ₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`  Net Profit/Loss     : ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')}\n`);

  // ── Build balance entries ──
  const entries = [];

  // Expense entries
  for (const [ledgerName, amt] of Object.entries(ledgerTotals)) {
    const parentGroup = PARENT_GROUPS[ledgerName] || 'Admin Expenses';
    const isAsset = ledgerName === 'Investments & Advances' || ledgerName === 'Office Equipment';
    entries.push({
      ledgerName,
      parentGroup,
      category: isAsset ? 'asset' : 'expense',
      amount: Math.round(amt),
      drCr: 'Dr',
      financialYear: FY,
      asOnDate: AS_ON_DATE,
      notes: `Auto-generated from ${payments.length} payment vouchers`,
      createdBy: 'system-script',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Income entries
  if (courseFeesBankTotal > 0) {
    entries.push({
      ledgerName: 'Course Fees',
      parentGroup: 'Direct Income',
      category: 'income',
      amount: courseFeesBankTotal,
      drCr: 'Cr',
      financialYear: FY,
      asOnDate: AS_ON_DATE,
      notes: `Auto-generated from ${receipts.filter(r => (r.paymentMode || '').toLowerCase() !== 'cash').length} bank receipt vouchers`,
      createdBy: 'system-script',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  if (courseFeesCashTotal > 0) {
    entries.push({
      ledgerName: 'Course Fees (Cash)',
      parentGroup: 'Direct Income',
      category: 'income',
      amount: courseFeesCashTotal,
      drCr: 'Cr',
      financialYear: FY,
      asOnDate: AS_ON_DATE,
      notes: `Auto-generated from ${receipts.filter(r => (r.paymentMode || '').toLowerCase() === 'cash').length} cash receipt vouchers`,
      createdBy: 'system-script',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`\n── ENTRIES TO INSERT: ${entries.length} ──`);
  for (const e of entries) {
    console.log(`  [${e.category.padEnd(7)}] ${e.ledgerName.padEnd(35)} | ${e.drCr} | ₹${e.amount.toLocaleString('en-IN').padStart(10)}`);
  }

  // ── Insert ──
  if (existingCount > 0) {
    console.log(`\n⚠️  Skipping insertion — ${existingCount} entries already exist for FY ${FY}.`);
    console.log('   Run: db.tally_manual_balances.deleteMany({financialYear: "2024-25"}) to clear first.');
  } else if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no entries inserted.');
  } else {
    const result = await balancesColl.insertMany(entries);
    console.log(`\n✅ Inserted ${result.insertedCount} balance entries for FY ${FY}`);
  }

  // Verification
  const finalCount = await balancesColl.countDocuments({ financialYear: FY });
  console.log(`\n── VERIFICATION ──`);
  console.log(`  Total entries in tally_manual_balances for FY ${FY}: ${finalCount}`);

  if (finalCount > 0) {
    const incomeTotal = await balancesColl.aggregate([
      { $match: { financialYear: FY, category: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const expenseTotal = await balancesColl.aggregate([
      { $match: { financialYear: FY, category: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const inc = incomeTotal[0]?.total || 0;
    const exp = expenseTotal[0]?.total || 0;
    console.log(`  Income:  ₹${inc.toLocaleString('en-IN')}`);
    console.log(`  Expense: ₹${exp.toLocaleString('en-IN')}`);
    console.log(`  Net:     ₹${(inc - exp).toLocaleString('en-IN')}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
