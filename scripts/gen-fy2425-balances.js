/**
 * Generate tally_manual_balances for FY 2024-25
 * by aggregating voucher data into income & expense ledger categories
 * using the same structure as FY 2023-24 entries.
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // ── 1. Study FY 2023-24 balance structure ──
  const fy23 = await db.collection('tally_manual_balances')
    .find({ financialYear: '2023-24' })
    .sort({ category: 1, ledgerName: 1 })
    .toArray();

  console.log('\n── FY 2023-24 BALANCE STRUCTURE (reference) ──');
  console.log(`Total entries: ${fy23.length}`);
  const cats23 = {};
  for (const b of fy23) {
    if (!cats23[b.category]) cats23[b.category] = [];
    cats23[b.category].push(b);
  }
  for (const cat of Object.keys(cats23).sort()) {
    console.log(`\n  ${cat.toUpperCase()} (${cats23[cat].length}):`);
    for (const e of cats23[cat]) {
      console.log(`    ${e.ledgerName.padEnd(35)} | ${e.parentGroup.padEnd(28)} | ${String(e.amount).padStart(10)} | ${e.drCr || '-'}`);
    }
  }

  // ── 2. Show one sample record to see all fields ──
  console.log('\n── SAMPLE RECORD ──');
  console.log(JSON.stringify(fy23[0], null, 2));

  // ── 3. Get FY 2024-25 vouchers ──
  const vouchers = await db.collection('tally_manual_vouchers')
    .find({ financialYear: '2024-25' })
    .toArray();

  // ── 4. Categorize payment vouchers by ledgerName/partyName ──
  // Map common party names to expense categories matching 2023-24 style
  const expenseMapping = {
    // Rent
    'RENT': { ledger: 'Rent', parent: 'Admin Expenses' },
    'OFFICE RENT': { ledger: 'Rent', parent: 'Admin Expenses' },
    // Teacher / Staff
    'TEACHER REMUNERATION': { ledger: 'Teacher Remuneration', parent: 'Admin Expenses' },
    // Facebook / Advertising
    'FACEBOOK ADV': { ledger: 'Advertisement Expenses', parent: 'Admin Expenses' },
    'FACEBOOK ADS': { ledger: 'Advertisement Expenses', parent: 'Admin Expenses' },
    // Electricity
    'ELECTRICITY': { ledger: 'Electricity Expenses', parent: 'Admin Expenses' },
    // Internet / Telecom
    'INTERNET / TELECOM': { ledger: 'Internet & Mobile Expenses', parent: 'Admin Expenses' },
    // Class Expenses
    'CLASS EXP': { ledger: 'Class Expenses', parent: 'Admin Expenses' },
    // Travelling
    'TRAVELLING EXP': { ledger: 'Travelling Expenses', parent: 'Admin Expenses' },
    // Office Exp
    'OFFICE EXP': { ledger: 'Office Expenses', parent: 'Admin Expenses' },
    // Printing & Stationery
    'PRINTING & STATIONERY': { ledger: 'Printing & Stationery', parent: 'Admin Expenses' },
    // Tax / GST
    'TAX / GST': { ledger: 'Tax Expenses', parent: 'Admin Expenses' },
    // Dividend
    'DIVIDEND': { ledger: 'Dividend Paid', parent: 'Admin Expenses' },
    // MACBOOK EMI
    'MACBOOK EMI': { ledger: 'Macbook EMI', parent: 'Admin Expenses' },
    // Zoom
    'ZOOM SUBSCRIPTION': { ledger: 'Subscription Expenses', parent: 'Admin Expenses' },
    // Canva
    'CANVA SUBSCRIPTION': { ledger: 'Subscription Expenses', parent: 'Admin Expenses' },
    // Domain
    'DOMAIN / GODADDY': { ledger: 'Internet & Mobile Expenses', parent: 'Admin Expenses' },
    // Shubham (credit card)
    'SHUBHAM': { ledger: 'Other Expenses', parent: 'Admin Expenses' },
    // Staff payments
    'MOHAN KALBURGI': { ledger: 'Director Salary', parent: 'Admin Expenses' },
    'UPAMNYU KALBURGI': { ledger: 'Staff Salary', parent: 'Admin Expenses' },
    'TURYA MOHAN': { ledger: 'Staff Salary', parent: 'Admin Expenses' },
    'PANDURANG': { ledger: 'Personal Expenses', parent: 'Admin Expenses' },
    'LAXMI MOHAN KAL': { ledger: 'Personal Expenses', parent: 'Admin Expenses' },
    // Lagad
    'LAGAD ABHAY MUK': { ledger: 'Professional Fees', parent: 'Admin Expenses' },
  };

  // Get payment vouchers
  const payments = vouchers.filter(v => v.voucherType === 'Payment');

  // Aggregate by mapped category
  const expenseAgg = {};
  const unmapped = {};

  for (const v of payments) {
    // Try to match by partyName first (exact), then by prefix
    let mapping = null;
    const pn = v.partyName.toUpperCase().trim();

    // Exact match
    if (expenseMapping[pn]) {
      mapping = expenseMapping[pn];
    } else {
      // Prefix match
      for (const [key, val] of Object.entries(expenseMapping)) {
        if (pn.startsWith(key)) {
          mapping = val;
          break;
        }
      }
    }

    if (mapping) {
      const key = mapping.ledger;
      if (!expenseAgg[key]) expenseAgg[key] = { parent: mapping.parent, amount: 0 };
      expenseAgg[key].amount += v.amount;
    } else {
      // Unmapped - collect for review
      if (!unmapped[pn]) unmapped[pn] = { count: 0, amount: 0 };
      unmapped[pn].count++;
      unmapped[pn].amount += v.amount;
    }
  }

  console.log('\n\n══════════════════════════════════════════════════════');
  console.log('  FY 2024-25 EXPENSE AGGREGATION');
  console.log('══════════════════════════════════════════════════════');

  console.log('\n── MAPPED EXPENSE CATEGORIES ──');
  let totalMapped = 0;
  for (const [ledger, data] of Object.entries(expenseAgg).sort((a, b) => b[1].amount - a[1].amount)) {
    console.log(`  ${ledger.padEnd(30)} | ${data.parent.padEnd(20)} | ₹${Math.round(data.amount).toLocaleString('en-IN').padStart(10)}`);
    totalMapped += data.amount;
  }
  console.log(`  ${'TOTAL MAPPED'.padEnd(30)} |${' '.padEnd(21)} | ₹${Math.round(totalMapped).toLocaleString('en-IN').padStart(10)}`);

  console.log('\n── UNMAPPED PARTIES (need categorization) ──');
  let totalUnmapped = 0;
  const sortedUnmapped = Object.entries(unmapped).sort((a, b) => b[1].amount - a[1].amount);
  for (const [party, data] of sortedUnmapped) {
    console.log(`  ${party.padEnd(45).slice(0,45)} | ${String(data.count).padStart(3)} txns | ₹${Math.round(data.amount).toLocaleString('en-IN').padStart(10)}`);
    totalUnmapped += data.amount;
  }
  console.log(`  ${'TOTAL UNMAPPED'.padEnd(45)} | ${String(sortedUnmapped.length).padStart(3)} parties | ₹${Math.round(totalUnmapped).toLocaleString('en-IN').padStart(10)}`);
  console.log(`\n  GRAND TOTAL: ₹${Math.round(totalMapped + totalUnmapped).toLocaleString('en-IN')}`);
  console.log(`  Payment Voucher Total: ₹${Math.round(payments.reduce((s, v) => s + v.amount, 0)).toLocaleString('en-IN')}`);

  // ── 5. Aggregate receipt vouchers for income ──
  const receipts = vouchers.filter(v => v.voucherType === 'Receipt');
  const cashReceipts = receipts.filter(v => v.paymentMode === 'Cash');
  const bankReceipts = receipts.filter(v => v.paymentMode !== 'Cash');

  console.log('\n── INCOME BREAKDOWN ──');
  const courseFeeBank = bankReceipts.reduce((s, v) => s + v.amount, 0);
  const courseFeeCash = cashReceipts.reduce((s, v) => s + v.amount, 0);
  console.log(`  Course Fees (Bank)   : ₹${Math.round(courseFeeBank).toLocaleString('en-IN')} (${bankReceipts.length} receipts)`);
  console.log(`  Course Fees (Cash)   : ₹${Math.round(courseFeeCash).toLocaleString('en-IN')} (${cashReceipts.length} receipts)`);
  console.log(`  Total Income         : ₹${Math.round(courseFeeBank + courseFeeCash).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
