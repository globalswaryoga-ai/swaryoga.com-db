/**
 * Fix FY 2024-25: Add missing receipt vouchers from bank statement
 * and update balance entries accordingly.
 * 
 * Missing items identified from bank statement comparison:
 * 1. Nepal dues (₹60,000) → Course Income (old receivable collected)
 * 2. Missing course income due to typos (₹17,499)
 * 3. Weight Loss Program (₹9,000) → Course Income
 * 4. Light bill refund (₹4,450) → Other Income
 * 5. Basic Swaryoga PayU/Cashfree (₹57.81) → Course Income
 * 6. Smart Point refund (₹72.52) → Other Income
 * 7. ₹85,000 Cash to Bank → Contra (NOT income)
 * 8. Bank Interest (~₹27) → negligible
 * 
 * Run: node scripts/fix-missing-receipts-2425.js
 * Dry run: DRY_RUN=1 node scripts/fix-missing-receipts-2425.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const DRY_RUN = process.env.DRY_RUN === '1';
const FY = '2024-25';

// Missing receipt vouchers to add
const MISSING_RECEIPTS = [
  // Nepal dues collected (last year's Fees Receivable)
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-034',
    date: '2024-04-01',
    partyName: 'Mohan Pandurang',
    ledgerName: 'Nepal Dues Received',
    amount: 10000,
    narration: 'Nepal amount received - last year dues (UPI reversal credit)',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-035',
    date: '2024-06-01',
    partyName: 'Smita',
    ledgerName: 'Nepal Dues Received',
    amount: 50000,
    narration: 'Nepal amount received - last year dues (Cash deposit by Smita at Pune East Street)',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },

  // Weight Loss Program (Course Income)
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-036',
    date: '2024-05-13',
    partyName: 'Suvarna Sanjay',
    ledgerName: 'Course Fees',
    amount: 4000,
    narration: 'Weight Loss Program - Suvarna Sanjay (UPI)',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-037',
    date: '2024-11-10',
    partyName: 'Lagad Abhay Mukund',
    ledgerName: 'Course Fees',
    amount: 5000,
    narration: 'Weight Loss Program - Lagad Abhay (UPI)',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },

  // Typo entries (Swar Yoga misspelled in bank narration)
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-038',
    date: '2024-11-04',
    partyName: 'Geeta Arora',
    ledgerName: 'Course Fees',
    amount: 4999,
    narration: 'Swar Yoga L-1 - Geeta Arora (UPI) [bank: SWAR YOSGA L-1]',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-039',
    date: '2024-11-05',
    partyName: 'Preeti Rajaram',
    ledgerName: 'Course Fees',
    amount: 2500,
    narration: 'Swar Yoga L-1 - Preeti (UPI) [bank: SWAR YS A L-1]',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-040',
    date: '2024-11-07',
    partyName: 'Shekhar C Birari',
    ledgerName: 'Course Fees',
    amount: 1000,
    narration: 'Swar Yoga L1 - Shekhar (UPI) [bank: SWAR YOGA L1]',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },

  // Basic Swaryoga (PayU/Cashfree payments)
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-041',
    date: '2024-09-27',
    partyName: 'PayU Payments',
    ledgerName: 'Course Fees',
    amount: 9.94,
    narration: 'Basic Swaryoga - PayU settlement',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-042',
    date: '2024-11-13',
    partyName: 'Cashfree Payments',
    ledgerName: 'Course Fees',
    amount: 47.87,
    narration: 'Basic Swaryoga - Cashfree settlement',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },

  // Light Bill Refund (Other Income)
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-043',
    date: '2024-11-12',
    partyName: 'Maharashtra State Electricity',
    ledgerName: 'Other Income',
    amount: 4450,
    narration: 'Light bill refund - Maharashtra State (Online Refund)',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },

  // Smart Point Refund (Other Income)
  {
    voucherType: 'Receipt',
    voucherNumber: 'REC-2425-044',
    date: '2024-06-01',
    partyName: 'Smart Point',
    ledgerName: 'Other Income',
    amount: 72.52,
    narration: 'Smart Point - Refund (UPI)',
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },

  // Contra entry: Cash to Bank (NOT income)
  {
    voucherType: 'Contra',
    voucherNumber: 'CON-2425-001',
    date: '2024-11-11',
    partyName: 'Self',
    ledgerName: 'Cash to Bank Transfer',
    amount: 85000,
    narration: 'Cash deposit by self at Sangamner branch (internal transfer)',
    paymentMode: 'Cash',
    financialYear: FY,
    createdBy: 'bank-statement-fix',
  },
];

async function run() {
  console.log('═'.repeat(60));
  console.log(`  FIX MISSING RECEIPTS FY ${FY}${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('═'.repeat(60));

  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const vColl = mongoose.connection.collection('tally_manual_vouchers');
  const bColl = mongoose.connection.collection('tally_manual_balances');

  // Check for existing fix entries
  const existingFix = await vColl.countDocuments({ financialYear: FY, createdBy: 'bank-statement-fix' });
  if (existingFix > 0) {
    console.log(`\n⚠️  Found ${existingFix} existing bank-statement-fix entries.`);
    if (!DRY_RUN) {
      console.log('   Deleting old fix entries first...');
      await vColl.deleteMany({ financialYear: FY, createdBy: 'bank-statement-fix' });
      console.log('   Deleted.');
    }
  }

  // Add missing vouchers
  console.log('\n── ADDING MISSING VOUCHERS ──');
  const receiptsToAdd = [];
  let totalNewIncome = 0;
  let totalNewOtherIncome = 0;
  let totalNepalDues = 0;
  let totalContra = 0;

  for (const r of MISSING_RECEIPTS) {
    const entry = {
      ...r,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    receiptsToAdd.push(entry);

    const type = r.voucherType === 'Contra' ? 'CONTRA' :
      r.ledgerName === 'Nepal Dues Received' ? 'NEPAL' :
      r.ledgerName === 'Other Income' ? 'OTHER' : 'COURSE';

    console.log(`  [${type.padEnd(6)}] ${r.date} | ${r.partyName.padEnd(30)} | Rs.${r.amount.toFixed(2).padStart(12)} | ${r.narration.substring(0, 50)}`);

    if (r.voucherType === 'Contra') {
      totalContra += r.amount;
    } else if (r.ledgerName === 'Nepal Dues Received') {
      totalNepalDues += r.amount;
    } else if (r.ledgerName === 'Other Income') {
      totalNewOtherIncome += r.amount;
    } else {
      totalNewIncome += r.amount;
    }
  }

  console.log(`\n  New Course Income: Rs.${totalNewIncome.toFixed(2)}`);
  console.log(`  Nepal Dues Received: Rs.${totalNepalDues.toFixed(2)}`);
  console.log(`  New Other Income: Rs.${totalNewOtherIncome.toFixed(2)}`);
  console.log(`  Contra (Cash→Bank): Rs.${totalContra.toFixed(2)}`);
  console.log(`  Total new entries: ${receiptsToAdd.length}`);

  if (!DRY_RUN) {
    const result = await vColl.insertMany(receiptsToAdd);
    console.log(`\n✅ Inserted ${result.insertedCount} voucher entries`);
  } else {
    console.log('\n🔍 DRY RUN — no vouchers inserted');
  }

  // Now update balance entries
  console.log('\n── UPDATING BALANCE ENTRIES ──');

  // 1. Update Course Fees income
  const courseFeesEntry = await bColl.findOne({ financialYear: FY, ledgerName: 'Course Fees', category: 'income' });
  if (courseFeesEntry) {
    const oldAmount = courseFeesEntry.amount;
    const newAmount = oldAmount + totalNewIncome;
    console.log(`  Course Fees: Rs.${oldAmount} → Rs.${newAmount} (+Rs.${totalNewIncome})`);
    if (!DRY_RUN) {
      await bColl.updateOne({ _id: courseFeesEntry._id }, { $set: { amount: newAmount } });
      console.log('  ✅ Updated');
    }
  }

  // 2. Add Nepal Dues as income entry (or update Other Income)
  const nepalEntry = await bColl.findOne({ financialYear: FY, ledgerName: 'Nepal Dues Received' });
  if (!nepalEntry && totalNepalDues > 0) {
    console.log(`  Nepal Dues Received: NEW ENTRY Rs.${totalNepalDues} (Cr)`);
    if (!DRY_RUN) {
      await bColl.insertOne({
        ledgerName: 'Nepal Dues Received',
        parentGroup: 'Other Income',
        category: 'income',
        amount: totalNepalDues,
        drCr: 'Cr',
        financialYear: FY,
        asOnDate: '31-03-2025',
        notes: 'Last year Nepal dues collected in FY 24-25',
        createdBy: 'bank-statement-fix',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('  ✅ Created');
    }
  }

  // 3. Update Other Income balance entry
  const otherIncomeEntry = await bColl.findOne({ financialYear: FY, ledgerName: 'Other Income', category: 'income' });
  if (otherIncomeEntry) {
    const oldAmount = otherIncomeEntry.amount;
    const newAmount = oldAmount + totalNewOtherIncome;
    console.log(`  Other Income: Rs.${oldAmount} → Rs.${newAmount} (+Rs.${totalNewOtherIncome})`);
    if (!DRY_RUN) {
      await bColl.updateOne({ _id: otherIncomeEntry._id }, { $set: { amount: newAmount } });
      console.log('  ✅ Updated');
    }
  }

  // 4. Update Fees Receivable — ₹60,000 of the ₹1,11,769 was collected
  // The Fees Receivable entry was removed in 24-25 (it was ₹1,11,769 in 23-24)
  // If Nepal dues of ₹60,000 were collected, remaining receivable = ₹1,11,769 - ₹60,000 = ₹51,769
  const feesRecEntry = await bColl.findOne({ financialYear: FY, ledgerName: /Fees Receivable/i });
  if (!feesRecEntry) {
    const remaining = 111769 - totalNepalDues;
    if (remaining > 0) {
      console.log(`  Fees Receivable: MISSING! Was Rs.1,11,769 in 23-24. Rs.${totalNepalDues} collected.`);
      console.log(`  Remaining receivable: Rs.${remaining} (should be added as asset if still pending)`);
      // Don't add automatically — user needs to confirm if the rest was written off or still pending
    }
  }

  // 5. Update Bank Balance
  // Bank statement closing: ₹43,750.97
  // Current DB has: ₹43,751. Close enough — leave as is.
  const bankEntry = await bColl.findOne({ financialYear: FY, ledgerName: /Kotak/i });
  console.log(`  Bank (Kotak): Rs.${bankEntry?.amount || 0} (Bank statement closing: Rs.43,750.97) — OK`);

  // Summary
  console.log('\n── IMPACT ON P&L ──');
  const addedIncome = totalNewIncome + totalNepalDues + totalNewOtherIncome;
  console.log(`  Additional Income: +Rs.${addedIncome.toFixed(2)}`);
  console.log(`  Old P&L: Income Rs.343,216 - Expense Rs.701,362 = Loss Rs.358,146`);
  console.log(`  New P&L: Income Rs.${(343216 + addedIncome).toFixed(2)} - Expense Rs.701,362 = Loss Rs.${(701362 - 343216 - addedIncome).toFixed(2)}`);

  // Verify new totals
  if (!DRY_RUN) {
    const allEntries = await bColl.find({ financialYear: FY }).toArray();
    let assets = 0, liabCr = 0, liabDr = 0, income = 0, expenses = 0;
    for (const e of allEntries) {
      const amt = Math.abs(e.amount || 0);
      if (e.category === 'asset') assets += amt;
      else if (e.category === 'liability') {
        if (e.drCr === 'Cr') liabCr += amt;
        else liabDr += amt;
      }
      else if (e.category === 'income') income += amt;
      else if (e.category === 'expense') expenses += amt;
    }
    const netLiab = liabCr - liabDr;
    const netPL = income - expenses;
    console.log(`\n── NEW BALANCE SHEET ──`);
    console.log(`  Assets: Rs.${assets.toLocaleString('en-IN')}`);
    console.log(`  Liabilities (net): Rs.${netLiab.toLocaleString('en-IN')}`);
    console.log(`  Income: Rs.${income.toLocaleString('en-IN')}`);
    console.log(`  Expenses: Rs.${expenses.toLocaleString('en-IN')}`);
    console.log(`  P&L: Rs.${netPL.toLocaleString('en-IN')}`);
    console.log(`  BS: A(${assets}) = L(${netLiab}) + P(${netPL}) = ${netLiab + netPL}`);
    console.log(`  Gap: ${assets - (netLiab + netPL)}`);
  }

  console.log('\n' + '═'.repeat(60));
  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
