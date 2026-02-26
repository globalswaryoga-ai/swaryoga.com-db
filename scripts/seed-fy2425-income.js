/**
 * FY 2024-25 Income Entries Seed Script
 * Creates ONLY income vouchers for Tally Prime page
 * 
 * Categories:
 * 1. Investment received - Preference Share Capital (investor name ledgers)
 * 2. Swar Yoga Income (course fees)
 * 3. Bank Interest Received
 * 4. Other Income
 * 5. Contra - Cash to Bank
 * 6. Old Workshop Fees (50,000 + 10,000)
 * 
 * Bank: Opening Balance = 37,440.78 | Closing Balance = 43,750.97
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/.env.local' });

const FY = '2024-25';
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// ════════════════════════════════════════════════════════════════════════════
// INVESTORS - Preference Share Capital (Total: ₹8,60,007.72)
// ════════════════════════════════════════════════════════════════════════════
const INVESTORS = [
  { name: 'Prashant Rajaram Pawar', transactions: [
    { date: '2024-04-17', amount: 50000, ref: 'NEFT N108242993421355' },
    { date: '2024-05-27', amount: 25000, ref: 'NEFT N148243058243433' },
  ]},
  { name: 'Damayanti M Gajra', transactions: [
    { date: '2024-05-03', amount: 25000, ref: 'NEFT HS92412442414963' },
  ]},
  { name: 'Supriyo Ghoshal', transactions: [
    { date: '2024-06-12', amount: 50000, ref: 'NEFT HS92416446945957' },
  ]},
  { name: 'Mahesh Chandra Agrawal', transactions: [
    { date: '2024-09-03', amount: 100000, ref: 'NEFT CBINH24247836349' },
  ]},
  { name: 'Avinash Pratap Singh', transactions: [
    { date: '2024-11-12', amount: 100000, ref: 'NEFT N317243393965957' },
  ]},
  { name: 'Dhanish Rawat', transactions: [
    { date: '2025-03-20', amount: 60004.72, ref: 'NEFT SBIN425079742803' },
  ]},
  { name: 'Minakshi Jha', transactions: [
    { date: '2024-04-19', amount: 99003, ref: 'UPI-411055796148' },
  ]},
  { name: 'Manjinder Kaur', transactions: [
    { date: '2024-04-23', amount: 45000, ref: 'UPI-411426085408' },
    { date: '2024-07-27', amount: 5000, ref: 'UPI-420957501199' },
  ]},
  { name: 'Dipesh Valecha', transactions: [
    { date: '2024-04-19', amount: 25000, ref: 'UPI-411053184685' },
  ]},
  { name: 'Anshu', transactions: [
    { date: '2024-05-23', amount: 31000, ref: 'UPI-414404647836' },
    { date: '2024-08-22', amount: 20000, ref: 'UPI-423520149310' },
  ]},
  { name: 'Meeta Vaid', transactions: [
    { date: '2024-07-24', amount: 25000, ref: 'IMPS-420620809664' },
  ]},
  { name: 'Hitesh Valecha', transactions: [
    { date: '2024-08-23', amount: 50000, ref: 'UPI-423633552631' },
  ]},
  { name: 'Ankur Ukey', transactions: [
    { date: '2024-08-23', amount: 25000, ref: 'NEFT HS92423654763406' },
  ]},
  { name: 'Arvind Kumar', transactions: [
    { date: '2024-09-03', amount: 25000, ref: 'UPI-424799986143' },
    { date: '2024-09-03', amount: 25000, ref: 'UPI-424733656204' },
  ]},
  { name: 'Poonam', transactions: [
    { date: '2024-11-05', amount: 50000, ref: 'IMPS-431022501107' },
  ]},
  { name: 'Pakhi Bhartia', transactions: [
    { date: '2024-06-12', amount: 25000, ref: 'MB-998671481067' },
  ]},
];

// ════════════════════════════════════════════════════════════════════════════
// CONTRA - Cash to Bank (Total: ₹1,35,000)
// ════════════════════════════════════════════════════════════════════════════
const CONTRA_CASH_TO_BANK = [
  { date: '2024-06-01', amount: 50000, narration: 'Cash Deposit by Smita at Pune East Street' },
  { date: '2024-11-11', amount: 85000, narration: 'Cash Deposit by Self at Sangamner' },
];

// ════════════════════════════════════════════════════════════════════════════
// OLD WORKSHOP FEES RECEIVED (Total: ₹60,000)
// ════════════════════════════════════════════════════════════════════════════
const OLD_WORKSHOP_FEES = [
  { date: '2024-04-01', amount: 50000, narration: 'Old Workshop Fees Received' },
  { date: '2024-04-01', amount: 10000, narration: 'Old Workshop Fees Received' },
];

// ════════════════════════════════════════════════════════════════════════════
// SWAR YOGA INCOME - Course Fees (from bank statement UPI credits)
// ════════════════════════════════════════════════════════════════════════════
// Aggregated from all small UPI credits that are course-related
// Total will be calculated from bank statement minus investments/contra/other

// ════════════════════════════════════════════════════════════════════════════
// BANK INTEREST RECEIVED
// ════════════════════════════════════════════════════════════════════════════
const BANK_INTEREST = [
  // Add if any interest entries found in statement
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  await mongoose.connect(uri, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FY 2024-25 INCOME ENTRIES SEED SCRIPT');
  console.log('Database:', db.databaseName);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Check existing FY 2024-25 data
  const existingLedgers = await db.collection('acc_ledgers').find({ financialYear: FY }).toArray();
  const existingVouchers = await db.collection('acc_vouchers').find({ financialYear: FY }).toArray();
  console.log(`Existing FY ${FY} data: ${existingLedgers.length} ledgers, ${existingVouchers.length} vouchers`);

  // Step 2: Delete existing income vouchers only (keep depreciation vouchers)
  const delResult = await db.collection('acc_vouchers').deleteMany({ 
    financialYear: FY, 
    voucherNumber: { $not: /^DEP-/ } 
  });
  console.log(`Deleted ${delResult.deletedCount} non-depreciation vouchers\n`);

  // Step 3: Create/Update Bank Ledger with Opening Balance
  console.log('--- Setting up Bank Ledger ---');
  await db.collection('acc_ledgers').updateOne(
    { financialYear: FY, name: 'Kotak Mahindra Bank' },
    { 
      $set: { 
        name: 'Kotak Mahindra Bank',
        group: 'ASSET',
        subGroup: 'Bank Accounts',
        ob: 37440.78,
        obType: 'DEBIT',
        financialYear: FY,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
  console.log('  ✓ Kotak Mahindra Bank - OB: ₹37,440.78 (Dr)\n');

  // Step 4: Create Cash-in-Hand Ledger
  await db.collection('acc_ledgers').updateOne(
    { financialYear: FY, name: 'Cash-in-Hand' },
    { 
      $set: { 
        name: 'Cash-in-Hand',
        group: 'ASSET',
        subGroup: 'Cash-in-Hand',
        ob: 0,
        obType: 'DEBIT',
        financialYear: FY,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
  console.log('  ✓ Cash-in-Hand - OB: ₹0\n');

  // Step 5: Create Preference Share Capital ledger
  await db.collection('acc_ledgers').updateOne(
    { financialYear: FY, name: 'Preference Share Capital' },
    { 
      $set: { 
        name: 'Preference Share Capital',
        group: 'CAPITAL',
        subGroup: 'Share Capital',
        ob: 0,
        obType: 'CREDIT',
        financialYear: FY,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
  console.log('  ✓ Preference Share Capital ledger created\n');

  // Step 6: Create Investor Ledgers (under Capital)
  console.log('--- Creating Investor Ledgers ---');
  let totalInvestment = 0;
  for (const investor of INVESTORS) {
    const investorTotal = investor.transactions.reduce((sum, t) => sum + t.amount, 0);
    totalInvestment += investorTotal;
    
    await db.collection('acc_ledgers').updateOne(
      { financialYear: FY, name: investor.name },
      { 
        $set: { 
          name: investor.name,
          group: 'CAPITAL',
          subGroup: 'Preference Share Capital',
          ob: 0,
          obType: 'CREDIT',
          financialYear: FY,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log(`  ✓ ${investor.name} - ₹${investorTotal.toLocaleString('en-IN')}`);
  }
  console.log(`  TOTAL INVESTMENT: ₹${totalInvestment.toLocaleString('en-IN')}\n`);

  // Step 7: Create Income Ledgers
  console.log('--- Creating Income Ledgers ---');
  const incomeLedgers = [
    { name: 'Swar Yoga Income', group: 'INCOME', subGroup: 'Direct Incomes' },
    { name: 'Bank Interest Received', group: 'INCOME', subGroup: 'Indirect Incomes' },
    { name: 'Other Income', group: 'INCOME', subGroup: 'Indirect Incomes' },
    { name: 'Old Workshop Fees', group: 'INCOME', subGroup: 'Direct Incomes' },
  ];
  
  for (const ledger of incomeLedgers) {
    await db.collection('acc_ledgers').updateOne(
      { financialYear: FY, name: ledger.name },
      { 
        $set: { 
          ...ledger,
          ob: 0,
          obType: 'CREDIT',
          financialYear: FY,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log(`  ✓ ${ledger.name}`);
  }
  console.log();

  // Step 8: Create Investment Receipt Vouchers
  console.log('--- Creating Investment Receipt Vouchers ---');
  let voucherNum = 1;
  
  for (const investor of INVESTORS) {
    for (const tx of investor.transactions) {
      const voucher = {
        voucherNumber: `REC-2425-${String(voucherNum).padStart(3, '0')}`,
        type: 'RECEIPT',
        date: new Date(tx.date),
        narration: `Investment received from ${investor.name} - Preference Share Capital (Ref: ${tx.ref})`,
        financialYear: FY,
        entries: [
          { ledgerName: 'Kotak Mahindra Bank', type: 'DEBIT', amount: tx.amount },
          { ledgerName: investor.name, type: 'CREDIT', amount: tx.amount },
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('acc_vouchers').insertOne(voucher);
      console.log(`  ✓ ${voucher.voucherNumber} | ${tx.date} | ${investor.name} | ₹${tx.amount.toLocaleString('en-IN')}`);
      voucherNum++;
    }
  }
  console.log(`  Created ${voucherNum - 1} investment vouchers\n`);

  // Step 9: Create Contra Vouchers (Cash to Bank)
  console.log('--- Creating Contra Vouchers (Cash to Bank) ---');
  let contraNum = 1;
  let totalContra = 0;
  
  for (const contra of CONTRA_CASH_TO_BANK) {
    totalContra += contra.amount;
    const voucher = {
      voucherNumber: `CONTRA-2425-${String(contraNum).padStart(3, '0')}`,
      type: 'CONTRA',
      date: new Date(contra.date),
      narration: contra.narration,
      financialYear: FY,
      entries: [
        { ledgerName: 'Kotak Mahindra Bank', type: 'DEBIT', amount: contra.amount },
        { ledgerName: 'Cash-in-Hand', type: 'CREDIT', amount: contra.amount },
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('acc_vouchers').insertOne(voucher);
    console.log(`  ✓ ${voucher.voucherNumber} | ${contra.date} | ₹${contra.amount.toLocaleString('en-IN')} | ${contra.narration}`);
    contraNum++;
  }
  console.log(`  TOTAL CONTRA: ₹${totalContra.toLocaleString('en-IN')}\n`);

  // Step 10: Create Old Workshop Fees Vouchers
  console.log('--- Creating Old Workshop Fees Vouchers ---');
  let workshopNum = 1;
  let totalWorkshop = 0;
  
  for (const fee of OLD_WORKSHOP_FEES) {
    totalWorkshop += fee.amount;
    const voucher = {
      voucherNumber: `REC-WS-2425-${String(workshopNum).padStart(3, '0')}`,
      type: 'RECEIPT',
      date: new Date(fee.date),
      narration: fee.narration,
      financialYear: FY,
      entries: [
        { ledgerName: 'Cash-in-Hand', type: 'DEBIT', amount: fee.amount },
        { ledgerName: 'Old Workshop Fees', type: 'CREDIT', amount: fee.amount },
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('acc_vouchers').insertOne(voucher);
    console.log(`  ✓ ${voucher.voucherNumber} | ${fee.date} | ₹${fee.amount.toLocaleString('en-IN')}`);
    workshopNum++;
  }
  console.log(`  TOTAL OLD WORKSHOP FEES: ₹${totalWorkshop.toLocaleString('en-IN')}\n`);

  // Step 11: Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('INCOME ENTRIES SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`1. Investment (Preference Share Capital): ₹${totalInvestment.toLocaleString('en-IN')}`);
  console.log(`2. Contra (Cash to Bank):                 ₹${totalContra.toLocaleString('en-IN')}`);
  console.log(`3. Old Workshop Fees:                     ₹${totalWorkshop.toLocaleString('en-IN')}`);
  console.log('');
  console.log('Bank Account:');
  console.log('  Opening Balance:  ₹37,440.78');
  console.log('  + Investments:    ₹' + totalInvestment.toLocaleString('en-IN'));
  console.log('  + Contra:         ₹' + totalContra.toLocaleString('en-IN'));
  console.log('  Expected Closing: ₹43,750.97');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Final count
  const finalLedgers = await db.collection('acc_ledgers').countDocuments({ financialYear: FY });
  const finalVouchers = await db.collection('acc_vouchers').countDocuments({ financialYear: FY });
  console.log(`Final: ${finalLedgers} ledgers, ${finalVouchers} vouchers in FY ${FY}`);

  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(console.error);
