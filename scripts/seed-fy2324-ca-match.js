/**
 * Complete FY 2023-24 Seed Script
 * Seeds the enterprise tally system (acc_*) to match the CA Audit Report exactly.
 * 
 * CA Report: UPAMNYU INTERNATIONAL EDUCATION PRIVATE LIMITED, FY 2023-24
 * All figures in ₹ (converted from "Rs. in Hundreds" in the original report)
 * 
 * P&L Target:
 *   Revenue: Course Fees 7,03,570 + Other Income 20,152 = 7,23,722
 *   Expenses: Depreciation 2,81,381 + Admin 5,21,797 = 8,03,178
 *   Loss Before Tax: (79,456)
 *   Deferred Tax Credit: (30,493)
 *   Net Loss: (48,963)
 * 
 * BS Target: Total = 8,66,815 (both sides)
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/.env.local' });

const FY = '2023-24';
// IMPORTANT: Engine reads from CRM DB via getCrmDb(), so acc_* data must be seeded there
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// ────────────────── CA REPORT FIGURES ──────────────────
// P&L - Revenue
const COURSE_FEES = 703570;
const OTHER_INCOME = 20152;
const TOTAL_REVENUE = COURSE_FEES + OTHER_INCOME; // 723722

// P&L - Admin Expenses (detailed breakdown)
const ADMIN_EXPENSES = {
  'Bank Charges and Commission': 41,
  'Office Rent': 52500,
  'Advertisement Expenses': 25900,
  'Electricity Expenses': 8805,
  'Office Expenses': 28122,
  'Class Expenses': 71180,
  'Training Expenses': 8660,
  'Internet and Mobile Expenses': 26798,
  'Printing and Stationery': 17650,
  'Professional Fees': 36300,
  'ROC Filing Fees': 100,
  'SA Tax Paid': 1180,
  'Travelling Expenses': 70080,
  'Teachers Fees': 174481,
};
const TOTAL_ADMIN = Object.values(ADMIN_EXPENSES).reduce((s, v) => s + v, 0); // 521797

// P&L - Depreciation (by asset)
const DEPRECIATION = {
  'Depreciation - Computer': 239516,
  'Depreciation - Furniture & Fixture': 10898,
  'Depreciation - Software': 11369,
  'Depreciation - Machinery & Equipment': 10743,
  'Depreciation - JBL Speaker': 1653,
  'Depreciation - Mobile': 7202,
};
const TOTAL_DEPRECIATION = Object.values(DEPRECIATION).reduce((s, v) => s + v, 0); // 281381

const TOTAL_EXPENSES = TOTAL_ADMIN + TOTAL_DEPRECIATION; // 803178
const LOSS_BEFORE_TAX = TOTAL_REVENUE - TOTAL_EXPENSES; // -79456
const DEFERRED_TAX_CREDIT = 30493;
const NET_LOSS = LOSS_BEFORE_TAX + DEFERRED_TAX_CREDIT; // -48963

// BS - Fixed Assets (Gross Block)
const FIXED_ASSETS = {
  'Computer': { gross: 0, depreciation: 239516 },
  'Furniture & Fixture': { gross: 0, depreciation: 10898 },
  'Software': { gross: 0, depreciation: 11369 },
  'Machinery & Equipment': { gross: 0, depreciation: 10743 },
  'JBL Speaker': { gross: 0, depreciation: 1653 },
  'Mobile': { gross: 0, depreciation: 7202 },
};
// Total gross block = 679100, Total depreciation = 281381, Net block = 397719
// We need to figure out gross values. Net block = 397719 and total depreciation = 281381
// So gross = 397719 + 281381 = 679100
// Individual gross values not specified in CA report, we'll use net values directly

const NET_FIXED_ASSETS = 397719;
const CASH_IN_HAND = 291886;
const BANK_BALANCE = 37441;
const FEES_RECEIVABLE = 111769;
const SUNDRY_ADVANCES = 28000;
const TOTAL_ASSETS = NET_FIXED_ASSETS + CASH_IN_HAND + BANK_BALANCE + FEES_RECEIVABLE + SUNDRY_ADVANCES; // 866815

// BS - Equity & Liabilities
const SHARE_CAPITAL = 610000;
const RESERVES_SURPLUS = -45192; // Accumulated loss (prev year profit 3771 - current year loss 48963)
const PREV_YEAR_PROFIT = 3771;
const DEFERRED_TAX_LIABILITY = -30493; // Actually a DTA (asset shown as negative liability in CA report)
const SHORT_TERM_PROVISIONS = 7500;
const OTHER_CURRENT_LIABILITIES = 325000;

// Verify: 610000 + (-45192) + (-30493) + 7500 + 325000 = 866815 ✓
const TOTAL_EQUITY_LIABILITIES = SHARE_CAPITAL + RESERVES_SURPLUS - DEFERRED_TAX_LIABILITY + SHORT_TERM_PROVISIONS + OTHER_CURRENT_LIABILITIES;

console.log('=== CA REPORT VERIFICATION ===');
console.log('Total Revenue:', TOTAL_REVENUE);
console.log('Total Admin Expenses:', TOTAL_ADMIN);
console.log('Total Depreciation:', TOTAL_DEPRECIATION);
console.log('Total Expenses:', TOTAL_EXPENSES);
console.log('Loss Before Tax:', LOSS_BEFORE_TAX);
console.log('Deferred Tax Credit:', DEFERRED_TAX_CREDIT);
console.log('Net Loss:', NET_LOSS);
console.log('Total Assets:', TOTAL_ASSETS);
console.log('Total Equity+Liabilities:', TOTAL_EQUITY_LIABILITIES);
console.log('BS Balanced:', TOTAL_ASSETS === TOTAL_EQUITY_LIABILITIES ? '✅ YES' : '❌ NO');

// ────────────────── LEDGER DEFINITIONS ──────────────────

const LEDGERS = [
  // === INCOME ===
  { name: 'Course Fees', group: 'INCOME', subGroup: 'Direct Incomes', ob: 0, obType: 'CREDIT' },
  { name: 'Other Income', group: 'INCOME', subGroup: 'Indirect Incomes', ob: 0, obType: 'CREDIT' },

  // === EXPENSES (Admin) ===
  { name: 'Bank Charges and Commission', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Office Rent', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Advertisement Expenses', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Electricity Expenses', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Office Expenses', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Class Expenses', group: 'EXPENSE', subGroup: 'Direct Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Training Expenses', group: 'EXPENSE', subGroup: 'Direct Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Internet and Mobile Expenses', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Printing and Stationery', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Professional Fees', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'ROC Filing Fees', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'SA Tax Paid', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Travelling Expenses', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Teachers Fees', group: 'EXPENSE', subGroup: 'Direct Expenses', ob: 0, obType: 'DEBIT' },

  // === EXPENSES (Depreciation) ===
  { name: 'Depreciation - Computer', group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT' },
  { name: 'Depreciation - Furniture & Fixture', group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT' },
  { name: 'Depreciation - Software', group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT' },
  { name: 'Depreciation - Machinery & Equipment', group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT' },
  { name: 'Depreciation - JBL Speaker', group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT' },
  { name: 'Depreciation - Mobile', group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT' },

  // === ASSETS ===
  { name: 'Fixed Assets (Net Block)', group: 'ASSET', subGroup: 'Fixed Assets', ob: NET_FIXED_ASSETS + TOTAL_DEPRECIATION, obType: 'DEBIT' },
  // Opening balance of fixed assets = closing gross block = 679100 (net 397719 + depreciation 281381)
  // But we also have depreciation expense entries, so the closing balance of FA will be:
  //   OB 679100 (Dr) — Depreciation 281381 (Cr via Accumulated Depreciation)
  // Actually, let's model it properly with separate accumulated depreciation
  
  { name: 'Cash-in-Hand', group: 'ASSET', subGroup: 'Cash-in-Hand', ob: 0, obType: 'DEBIT' },
  // Cash-in-Hand closing = 291886. We need to track where it comes from.
  // Since we're matching CA report at year-end, we'll set OB + movements = 291886
  
  { name: 'Kotak Mahindra Bank', group: 'ASSET', subGroup: 'Bank Accounts', ob: 71280.60, obType: 'DEBIT' },
  // Bank: OB 71,280.60, CB should be 37,441 after all transactions
  
  { name: 'Fees Receivable', group: 'ASSET', subGroup: 'Sundry Debtors', ob: 0, obType: 'DEBIT' },
  { name: 'Sundry Advances', group: 'ASSET', subGroup: 'Current Assets', ob: 0, obType: 'DEBIT' },
  { name: 'Accumulated Depreciation', group: 'ASSET', subGroup: 'Fixed Assets', ob: 0, obType: 'CREDIT' },
  // An contra-asset account to track accumulated depreciation
  
  // === CAPITAL ===
  { name: 'Share Capital', group: 'CAPITAL', subGroup: 'Share Capital', ob: SHARE_CAPITAL, obType: 'CREDIT' },
  { name: 'Reserves & Surplus', group: 'CAPITAL', subGroup: 'Reserves & Surplus', ob: PREV_YEAR_PROFIT, obType: 'CREDIT' },
  // Previous year profit = 3771 as opening balance in Reserves
  
  // === LIABILITIES ===
  { name: 'Deferred Tax Asset', group: 'ASSET', subGroup: 'Current Assets', ob: 0, obType: 'DEBIT' },
  // DTA = 30493 (shown as negative liability in CA report, but it's actually an asset)
  { name: 'Short-Term Provisions', group: 'LIABILITY', subGroup: 'Provisions', ob: 0, obType: 'CREDIT' },
  { name: 'Other Current Liabilities', group: 'LIABILITY', subGroup: 'Current Liabilities', ob: 0, obType: 'CREDIT' },

  // Director accounts (for bank transactions)
  { name: 'Upamanyu Kalburgi (Director)', group: 'CAPITAL', subGroup: 'Capital Account', ob: 0, obType: 'CREDIT' },
  { name: 'Mohan Kalburgi (Director)', group: 'CAPITAL', subGroup: 'Capital Account', ob: 0, obType: 'CREDIT' },
  { name: 'Dividend Paid', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  { name: 'Swar Sakshi International', group: 'CAPITAL', subGroup: 'Capital Account', ob: 0, obType: 'CREDIT' },
];

// ────────────────── SEED FUNCTION ──────────────────

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  await mongoose.connect(uri, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log('\nConnected to:', db.databaseName);

  // Step 0: Clear existing data for clean seed
  console.log('\n--- Clearing existing FY 2023-24 data ---');
  const delLedgers = await db.collection('acc_ledgers').deleteMany({ financialYear: FY });
  const delVouchers = await db.collection('acc_vouchers').deleteMany({ financialYear: FY });
  const delGroups = await db.collection('acc_groups').deleteMany({ financialYear: FY });
  const delFY = await db.collection('acc_financial_years').deleteMany({ code: FY });
  console.log(`  Deleted: ${delLedgers.deletedCount} ledgers, ${delVouchers.deletedCount} vouchers, ${delGroups.deletedCount} groups, ${delFY.deletedCount} FYs`);

  // Step 1: Create Financial Year
  console.log('\n--- Creating Financial Year ---');
  await db.collection('acc_financial_years').insertOne({
    code: FY,
    label: 'FY 2023-24',
    startDate: new Date('2023-04-01'),
    endDate: new Date('2024-03-31'),
    isCurrent: true,
    isClosed: false,
    companyName: 'Upamnyu International Education Pvt. Ltd.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('  Created FY 2023-24');

  // Step 2: Seed Default Groups
  console.log('\n--- Seeding Groups ---');
  const DEFAULT_GROUPS = [
    { name: 'Cash-in-Hand', nature: 'ASSET', report: 'balance_sheet' },
    { name: 'Bank Accounts', nature: 'ASSET', report: 'balance_sheet' },
    { name: 'Fixed Assets', nature: 'ASSET', report: 'balance_sheet' },
    { name: 'Current Assets', nature: 'ASSET', report: 'balance_sheet' },
    { name: 'Sundry Debtors', nature: 'ASSET', report: 'balance_sheet' },
    { name: 'Investments', nature: 'ASSET', report: 'balance_sheet' },
    { name: 'Current Liabilities', nature: 'LIABILITY', report: 'balance_sheet' },
    { name: 'Sundry Creditors', nature: 'LIABILITY', report: 'balance_sheet' },
    { name: 'Secured Loans', nature: 'LIABILITY', report: 'balance_sheet' },
    { name: 'Unsecured Loans', nature: 'LIABILITY', report: 'balance_sheet' },
    { name: 'Duties & Taxes', nature: 'LIABILITY', report: 'balance_sheet' },
    { name: 'Provisions', nature: 'LIABILITY', report: 'balance_sheet' },
    { name: 'Direct Incomes', nature: 'INCOME', report: 'profit_loss', affectsGrossProfit: true },
    { name: 'Indirect Incomes', nature: 'INCOME', report: 'profit_loss' },
    { name: 'Sales Accounts', nature: 'INCOME', report: 'profit_loss', affectsGrossProfit: true },
    { name: 'Direct Expenses', nature: 'EXPENSE', report: 'profit_loss', affectsGrossProfit: true },
    { name: 'Indirect Expenses', nature: 'EXPENSE', report: 'profit_loss' },
    { name: 'Purchase Accounts', nature: 'EXPENSE', report: 'profit_loss', affectsGrossProfit: true },
    { name: 'Admin Expenses', nature: 'EXPENSE', report: 'profit_loss' },
    { name: 'Depreciation', nature: 'EXPENSE', report: 'profit_loss' },
    { name: 'Capital Account', nature: 'CAPITAL', report: 'balance_sheet' },
    { name: 'Share Capital', nature: 'CAPITAL', report: 'balance_sheet' },
    { name: 'Share Premium', nature: 'CAPITAL', report: 'balance_sheet' },
    { name: 'Capital Reserve', nature: 'CAPITAL', report: 'balance_sheet' },
    { name: 'General Reserve', nature: 'CAPITAL', report: 'balance_sheet' },
    { name: 'Retained Earnings', nature: 'CAPITAL', report: 'balance_sheet' },
    { name: 'Surplus from P&L A/c', nature: 'CAPITAL', report: 'balance_sheet' },
    { name: 'Reserves & Surplus', nature: 'CAPITAL', report: 'balance_sheet' },
  ];
  const groupDocs = DEFAULT_GROUPS.map(g => ({
    ...g,
    financialYear: FY,
    isSystemDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await db.collection('acc_groups').insertMany(groupDocs);
  console.log(`  Created ${groupDocs.length} groups`);

  // Step 3: Create Ledgers
  // Strategy: Instead of using opening balances and vouchers for P&L items,
  // we'll create journal entries that match the exact CA report amounts.
  // For BS items, we use opening balances where appropriate and journal entries for the rest.
  
  console.log('\n--- Creating Ledgers ---');
  
  // Simplified ledger list - opening balances only for BS items that existed at April 1, 2023
  const ledgerDefs = [
    // INCOME (no opening balance, all from vouchers)
    { name: 'Course Fees', group: 'INCOME', subGroup: 'Direct Incomes', ob: 0, obType: 'CREDIT' },
    { name: 'Other Income', group: 'INCOME', subGroup: 'Indirect Incomes', ob: 0, obType: 'CREDIT' },

    // EXPENSES - Admin (no opening balance, all from vouchers)
    ...Object.keys(ADMIN_EXPENSES).map(name => ({
      name, group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT'
    })),

    // EXPENSES - Depreciation
    ...Object.keys(DEPRECIATION).map(name => ({
      name, group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT'
    })),

    // ASSETS - Fixed Assets (net block at start of year = 679100)
    { name: 'Fixed Assets (Gross Block)', group: 'ASSET', subGroup: 'Fixed Assets', ob: 679100, obType: 'DEBIT' },
    { name: 'Accumulated Depreciation', group: 'ASSET', subGroup: 'Fixed Assets', ob: 0, obType: 'CREDIT' },
    // After depreciation journal: Gross 679100 - AccDep 281381 = Net 397719 ✓
    
    // ASSETS - Current
    { name: 'Cash-in-Hand', group: 'ASSET', subGroup: 'Cash-in-Hand', ob: 0, obType: 'DEBIT' },
    { name: 'Kotak Mahindra Bank', group: 'ASSET', subGroup: 'Bank Accounts', ob: 0, obType: 'DEBIT' },
    { name: 'Fees Receivable', group: 'ASSET', subGroup: 'Sundry Debtors', ob: 0, obType: 'DEBIT' },
    { name: 'Sundry Advances', group: 'ASSET', subGroup: 'Current Assets', ob: 0, obType: 'DEBIT' },
    { name: 'Deferred Tax Asset', group: 'ASSET', subGroup: 'Current Assets', ob: 0, obType: 'DEBIT' },

    // CAPITAL
    { name: 'Share Capital', group: 'CAPITAL', subGroup: 'Share Capital', ob: 610000, obType: 'CREDIT' },
    { name: 'Reserves & Surplus', group: 'CAPITAL', subGroup: 'Reserves & Surplus', ob: PREV_YEAR_PROFIT, obType: 'CREDIT' },
    // Reserves OB = 3771 (prev year profit). P&L will add current year loss of -48963.

    // LIABILITIES
    { name: 'Short-Term Provisions', group: 'LIABILITY', subGroup: 'Provisions', ob: 0, obType: 'CREDIT' },
    { name: 'Other Current Liabilities', group: 'LIABILITY', subGroup: 'Current Liabilities', ob: 0, obType: 'CREDIT' },
    
    // Director/Related Party accounts for bank statement transactions
    { name: 'Upamanyu Kalburgi (Director)', group: 'CAPITAL', subGroup: 'Capital Account', ob: 0, obType: 'CREDIT' },
    { name: 'Mohan Kalburgi (Director)', group: 'CAPITAL', subGroup: 'Capital Account', ob: 0, obType: 'CREDIT' },
    { name: 'Swar Sakshi International', group: 'CAPITAL', subGroup: 'Capital Account', ob: 0, obType: 'CREDIT' },
    { name: 'Dividend Paid', group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' },
  ];

  const ledgerMap = {}; // name -> ObjectId
  for (const ld of ledgerDefs) {
    const doc = {
      name: ld.name,
      group: ld.group,
      subGroup: ld.subGroup,
      openingBalance: ld.ob,
      openingBalanceType: ld.obType,
      financialYear: FY,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('acc_ledgers').insertOne(doc);
    ledgerMap[ld.name] = result.insertedId;
  }
  console.log(`  Created ${ledgerDefs.length} ledgers`);

  // Step 4: Create Vouchers
  // We need journal entries to set up the exact amounts as per CA report.
  // Strategy: 
  //   For P&L items: Journal entries debiting expenses / crediting income
  //   For BS close items: Journal entries for items that have closing balances
  
  console.log('\n--- Creating Vouchers ---');
  let voucherCount = 0;

  function makeEntry(ledgerName, amount, type) {
    return {
      ledger: ledgerName,
      ledgerId: ledgerMap[ledgerName],
      ledgerName: ledgerName,
      amount: Math.round(amount * 100) / 100,
      type: type, // 'DEBIT' or 'CREDIT'
    };
  }

  async function createVoucher(type, date, entries, narration) {
    voucherCount++;
    const prefix = { RECEIPT: 'REC', PAYMENT: 'PAY', JOURNAL: 'JRN', CONTRA: 'CTR' }[type] || 'JRN';
    const voucherNumber = prefix + '-' + String(voucherCount).padStart(4, '0');
    const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.02) {
      console.error('  ❌ UNBALANCED:', narration, 'Dr:', totalDebit, 'Cr:', totalCredit);
      return;
    }

    await db.collection('acc_vouchers').insertOne({
      voucherNumber,
      date: new Date(date),
      type,
      entries,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      narration,
      financialYear: FY,
      isReversed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ── 4a. Income Entries ──
  // Course Fees: ₹7,03,570 (received through bank and cash)
  // Split: Bank receipts + Cash receipts
  // From bank analysis: Course Fees ₹1,99,501 via bank. Rest ₹5,04,069 via cash.
  
  await createVoucher('RECEIPT', '2024-03-31', [
    makeEntry('Kotak Mahindra Bank', 199501, 'DEBIT'),
    makeEntry('Course Fees', 199501, 'CREDIT'),
  ], 'Course Fees received via Bank (FY 2023-24 aggregate)');

  await createVoucher('RECEIPT', '2024-03-31', [
    makeEntry('Cash-in-Hand', 504069, 'DEBIT'),
    makeEntry('Course Fees', 504069, 'CREDIT'),
  ], 'Course Fees received via Cash (FY 2023-24 aggregate)');

  // Other Income: ₹20,152
  // From bank: ₹5,920 via bank. Rest ₹14,232 via cash.
  await createVoucher('RECEIPT', '2024-03-31', [
    makeEntry('Kotak Mahindra Bank', 5920, 'DEBIT'),
    makeEntry('Other Income', 5920, 'CREDIT'),
  ], 'Other Income received via Bank');

  await createVoucher('RECEIPT', '2024-03-31', [
    makeEntry('Cash-in-Hand', 14232, 'DEBIT'),
    makeEntry('Other Income', 14232, 'CREDIT'),
  ], 'Other Income received via Cash');

  // ── 4b. Admin Expense Entries ──
  // We'll create individual journal entries for each expense head
  // matching the exact CA report amounts. Some are paid via bank, rest via cash.
  
  // Bank-paid expenses (from bank statement analysis):
  const bankExpenses = {
    'Advertisement Expenses': 15400,
    'Internet and Mobile Expenses': 14178,
    'Training Expenses': 8660,
    'Travelling Expenses': 10930,
    'Office Expenses': 7200,
    'Bank Charges and Commission': 41,
  };

  for (const [name, bankAmt] of Object.entries(bankExpenses)) {
    const total = ADMIN_EXPENSES[name];
    const cashAmt = total - bankAmt;

    // Bank portion
    if (bankAmt > 0) {
      await createVoucher('PAYMENT', '2024-03-31', [
        makeEntry(name, bankAmt, 'DEBIT'),
        makeEntry('Kotak Mahindra Bank', bankAmt, 'CREDIT'),
      ], `${name} paid via Bank`);
    }

    // Cash portion
    if (cashAmt > 0) {
      await createVoucher('PAYMENT', '2024-03-31', [
        makeEntry(name, cashAmt, 'DEBIT'),
        makeEntry('Cash-in-Hand', cashAmt, 'CREDIT'),
      ], `${name} paid via Cash`);
    }
  }

  // Cash-only expenses (not in bank statement)
  const cashOnlyExpenses = {
    'Office Rent': 52500,
    'Electricity Expenses': 8805,
    'Printing and Stationery': 17650,
    'Professional Fees': 36300,
    'ROC Filing Fees': 100,
    'SA Tax Paid': 1180,
    'Class Expenses': 71180,
    'Teachers Fees': 174481,
  };

  // Some of these were partially through bank, let's route them properly
  // From bank analysis: Travelling = partially bank. Let's check what remains.
  // Travelling: Total 70080, bank portion already 10930, remaining 59150 = cash
  // These expenses that are purely cash-paid:
  for (const [name, amount] of Object.entries(cashOnlyExpenses)) {
    await createVoucher('PAYMENT', '2024-03-31', [
      makeEntry(name, amount, 'DEBIT'),
      makeEntry('Cash-in-Hand', amount, 'CREDIT'),
    ], `${name} paid via Cash`);
  }

  // Remaining bank expenses from bank statement:
  // Travelling remaining via cash
  const travelCash = 70080 - 10930; // 59150
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Travelling Expenses', travelCash, 'DEBIT'),
    makeEntry('Cash-in-Hand', travelCash, 'CREDIT'),
  ], 'Travelling Expenses paid via Cash (remaining)');

  // Internet remaining via cash
  const internetCash = 26798 - 14178; // 12620
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Internet and Mobile Expenses', internetCash, 'DEBIT'),
    makeEntry('Cash-in-Hand', internetCash, 'CREDIT'),
  ], 'Internet & Mobile Expenses paid via Cash (remaining)');

  // Advertisement remaining via cash
  const adCash = 25900 - 15400; // 10500
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Advertisement Expenses', adCash, 'DEBIT'),
    makeEntry('Cash-in-Hand', adCash, 'CREDIT'),
  ], 'Advertisement Expenses paid via Cash (remaining)');

  // Office Expenses remaining via cash
  const officeCash = 28122 - 7200; // 20922
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Office Expenses', officeCash, 'DEBIT'),
    makeEntry('Cash-in-Hand', officeCash, 'CREDIT'),
  ], 'Office Expenses paid via Cash (remaining)');

  // ── 4c. Depreciation Entries ──
  // Debit each depreciation expense, Credit Accumulated Depreciation
  for (const [name, amount] of Object.entries(DEPRECIATION)) {
    await createVoucher('JOURNAL', '2024-03-31', [
      makeEntry(name, amount, 'DEBIT'),
      makeEntry('Accumulated Depreciation', amount, 'CREDIT'),
    ], `Depreciation for FY 2023-24: ${name.replace('Depreciation - ', '')}`);
  }

  // ── 4d. Director Transactions (from bank statement) ──
  // Upamanyu: ₹90,549 paid out (Director withdrawals/payments)
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Upamanyu Kalburgi (Director)', 90549, 'DEBIT'),
    makeEntry('Kotak Mahindra Bank', 90549, 'CREDIT'),
  ], 'Director payments - Upamanyu Kalburgi');

  // Mohan: ₹55,700 paid out
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Mohan Kalburgi (Director)', 55700, 'DEBIT'),
    makeEntry('Kotak Mahindra Bank', 55700, 'CREDIT'),
  ], 'Director payments - Mohan Kalburgi');

  // Dividend Paid: ₹23,050
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Dividend Paid', 23050, 'DEBIT'),
    makeEntry('Kotak Mahindra Bank', 23050, 'CREDIT'),
  ], 'Dividend payments via Bank');

  // Swar Sakshi International: ₹21,694 (net - payments out to related entity)
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Swar Sakshi International', 21694, 'DEBIT'),
    makeEntry('Kotak Mahindra Bank', 21694, 'CREDIT'),
  ], 'Payments to Swar Sakshi International');

  // Reversal entries (bank): ₹2,920
  await createVoucher('PAYMENT', '2024-03-31', [
    makeEntry('Office Expenses', 2920, 'DEBIT'),
    makeEntry('Kotak Mahindra Bank', 2920, 'CREDIT'),
  ], 'Miscellaneous bank debits / reversals');

  // Other bank deposits (Swar Sakshi incoming + misc): ₹128,746
  // From bank analysis: Total deposits = 334,167. Course Fees 199,501 + Other Income 5,920 = 205,421.
  // Remaining deposits = 334,167 - 205,421 = 128,746
  // These are likely director deposits / Swar Sakshi capital infusions
  await createVoucher('RECEIPT', '2024-03-31', [
    makeEntry('Kotak Mahindra Bank', 128746, 'DEBIT'),
    makeEntry('Other Current Liabilities', 128746, 'CREDIT'),
  ], 'Other deposits received - directors/related party');

  // ── 4e. Balance Sheet Closing Entries (Journal) ──
  
  // Fees Receivable: ₹1,11,769
  await createVoucher('JOURNAL', '2024-03-31', [
    makeEntry('Fees Receivable', 111769, 'DEBIT'),
    makeEntry('Cash-in-Hand', 111769, 'CREDIT'),
  ], 'Fees receivable at year end (outstanding)');
  // This represents fees earned but not yet collected. 
  // Actually, this should be against Course Fees/Other Income, but we already credited the full amount.
  // So this must be a reclassification from cash to receivable.
  // Actually, let me rethink: The total Course Fees is 703570. 
  // Some was received in cash, some in bank, some is still receivable.
  // Receivable = 111769 means this much hasn't been collected.
  // So we need to adjust: reduce cash receipts by 111769 and add Fees Receivable.
  // But we already created the vouchers... Let me handle it as a reclassification.

  // Sundry Advances: ₹28,000
  await createVoucher('JOURNAL', '2024-03-31', [
    makeEntry('Sundry Advances', 28000, 'DEBIT'),
    makeEntry('Cash-in-Hand', 28000, 'CREDIT'),
  ], 'Sundry advances given during FY 2023-24');

  // Deferred Tax Asset: ₹30,493
  await createVoucher('JOURNAL', '2024-03-31', [
    makeEntry('Deferred Tax Asset', 30493, 'DEBIT'),
    makeEntry('Reserves & Surplus', 30493, 'CREDIT'),
  ], 'Deferred Tax Asset recognition (tax benefit on loss)');
  // This reduces the net loss impact on reserves by the DTA amount

  // Short-Term Provisions: ₹7,500
  await createVoucher('JOURNAL', '2024-03-31', [
    makeEntry('Cash-in-Hand', 7500, 'DEBIT'),
    makeEntry('Short-Term Provisions', 7500, 'CREDIT'),
  ], 'Short-term provisions at year end');

  // Other Current Liabilities: ₹3,25,000 total
  // We already credited 128,746 from bank deposits
  // Remaining = 325,000 - 128,746 = 196,254
  await createVoucher('JOURNAL', '2024-03-31', [
    makeEntry('Cash-in-Hand', 196254, 'DEBIT'),
    makeEntry('Other Current Liabilities', 196254, 'CREDIT'),
  ], 'Other current liabilities at year end (loans from directors, etc.)');

  // ── 4f. Bank Opening Balance ──
  // Bank OB = 71,280.60. We need to set this as a journal entry since OB is 0.
  await createVoucher('JOURNAL', '2023-04-01', [
    makeEntry('Kotak Mahindra Bank', 71280.60, 'DEBIT'),
    makeEntry('Reserves & Surplus', 71280.60, 'CREDIT'),
  ], 'Bank opening balance B/F from previous year');

  // ── 4g. Cash Opening Balance ──
  // Cash-in-Hand closing should be 291886. Let me calculate what the cash balance will be:
  // Cash receives: 504069 (Course) + 14232 (Other Income) + 7500 (Provisions) + 196254 (OCL) = 722055
  // Cash pays: All cash expenses + Fees Receivable reclassification + Sundry Advances
  // = 10500(Ad) + 12620(Internet) + 59150(Travel) + 20922(OfficeExp) + 52500(Rent) + 8805(Elec) 
  //   + 17650(Print) + 36300(Prof) + 100(ROC) + 1180(SATax) + 71180(Class) + 174481(Teachers)
  //   + 111769(Receivable) + 28000(Advances) = 605157
  // Net cash = 722055 - 605157 = 116898
  // But closing should be 291886. Need additional cash OB = 291886 - 116898 = 174988
  
  const cashReceives = 504069 + 14232 + 7500 + 196254;
  const cashPays = 10500 + 12620 + 59150 + 20922 + 52500 + 8805 + 17650 + 36300 + 100 + 1180 + 71180 + 174481 + 111769 + 28000;
  const netCash = cashReceives - cashPays;
  const cashOBNeeded = CASH_IN_HAND - netCash;
  
  console.log('  Cash analysis: Receives:', cashReceives, 'Pays:', cashPays, 'Net:', netCash, 'OB needed:', cashOBNeeded);

  await createVoucher('JOURNAL', '2023-04-01', [
    makeEntry('Cash-in-Hand', cashOBNeeded, 'DEBIT'),
    makeEntry('Reserves & Surplus', cashOBNeeded, 'CREDIT'),
  ], 'Cash-in-Hand opening balance B/F from previous year');

  // Now let me verify bank closing:
  // Bank debits: 199501(Course) + 5920(OtherIncome) + 128746(Other deposits) + 71280.60(OB) = 405447.60
  // Bank credits: 15400(Ad) + 14178(Internet) + 8660(Training) + 10930(Travel) + 7200(OffExp) + 41(Bank charges)
  //   + 90549(Upamanyu) + 55700(Mohan) + 23050(Dividend) + 21694(SwarSakshi) + 2920(Misc) = 250322
  // Bank closing = 405447.60 - 250322 = 155125.60
  // But target is 37441! There's a big gap.
  
  const bankDebits = 199501 + 5920 + 128746 + 71280.60;
  const bankCredits = 15400 + 14178 + 8660 + 10930 + 7200 + 41 + 90549 + 55700 + 23050 + 21694 + 2920;
  const bankClosing = bankDebits - bankCredits;
  console.log('  Bank analysis: Debits:', bankDebits, 'Credits:', bankCredits, 'Closing:', bankClosing.toFixed(2));
  console.log('  Bank target:', BANK_BALANCE, 'Gap:', (bankClosing - BANK_BALANCE).toFixed(2));

  // The gap = 155125.60 - 37441 = 117684.60
  // This means there are additional bank withdrawals we haven't accounted for.
  // From the original bank analysis: Total withdrawals = 474343, Total deposits = 334167
  // Bank OB = 71280.60, CB = 71280.60 + 334167 - 474343 = -68895.40... that's wrong.
  // Actually: CB = OB + Deposits - Withdrawals = 71280.60 + 334167 - 474343 = -68895.40
  // Wait, that can't be right. The CA report says bank closing = 37441.
  // Bank statement says CB = 37440.78.
  // So: 71280.60 + TotalDeposits - TotalWithdrawals = 37440.78
  // TotalDeposits - TotalWithdrawals = 37440.78 - 71280.60 = -33839.82
  
  // The bank analysis from earlier covered only txns 105-308 (Nov 2023 - Mar 2024).
  // There were also txns 1-104 (Apr 2023 - Oct 2023) from the Excel Tally import.
  // The Excel import covered those transactions. Let's use the full picture.
  
  // Since we need the bank to close at exactly 37441, and we have OB 71280.60,
  // net movement should be 37441 - 71280.60 = -33839.60
  // Our current net = 405447.60 - 71280.60 - 250322 = 83845
  // Wait, let me recalculate without the OB journal:
  // Bank receipts: 199501 + 5920 + 128746 = 334167
  // Bank payments: 250322
  // Net bank movement = 334167 - 250322 = 83845
  // Closing = 71280.60 + 83845 = 155125.60
  // But should be 37441. So additional bank payments needed = 155125.60 - 37441 = 117684.60
  
  // These additional payments include things from the Apr-Oct period (Excel data)
  // that were categorized but we simplified them above.
  // Let me add a balancing entry for the remaining bank outflows.
  
  const bankAdjustment = bankClosing - BANK_BALANCE;
  if (Math.abs(bankAdjustment) > 0.01) {
    // These represent additional bank payments (Apr-Oct period + uncategorized)
    // Route them through Cash-in-Hand as the company likely withdrew cash from bank
    await createVoucher('CONTRA', '2024-03-31', [
      makeEntry('Cash-in-Hand', bankAdjustment, 'DEBIT'),
      makeEntry('Kotak Mahindra Bank', bankAdjustment, 'CREDIT'),
    ], 'Bank to Cash withdrawals (full year, balancing entry to match bank closing ₹37,441)');
    
    console.log('  Bank adjustment (bank→cash):', bankAdjustment.toFixed(2));
  }

  // Now verify total accounts:
  console.log('\n--- VERIFICATION ---');
  
  // Recalculate cash closing after adjustment
  const finalCashOB = cashOBNeeded;
  const finalCashIn = cashReceives + bankAdjustment;
  const finalCashOut = cashPays;
  const finalCashClosing = finalCashOB + finalCashIn - finalCashOut;
  console.log('  Cash: OB', finalCashOB, '+ In', finalCashIn.toFixed(2), '- Out', finalCashOut, '= Closing', finalCashClosing.toFixed(2));
  console.log('  Cash target:', CASH_IN_HAND, 'Match:', Math.abs(finalCashClosing - CASH_IN_HAND) < 1 ? '✅' : '❌');

  // Now adjust cash OB if cash doesn't match
  // Actually, we need to recalculate the cash OB needed
  // Final cash closing = cashOBNeeded + cashReceives + bankAdjustment - cashPays = CASH_IN_HAND
  // cashOBNeeded = CASH_IN_HAND - cashReceives - bankAdjustment + cashPays
  const correctCashOB = CASH_IN_HAND - cashReceives - bankAdjustment + cashPays;
  console.log('  Correct Cash OB should be:', correctCashOB.toFixed(2));
  
  // We already created the cash OB journal. We need to update it or add an adjustment.
  // Since cashOBNeeded was calculated without the bankAdjustment, we need to fix it.
  // Difference = correctCashOB - cashOBNeeded = -bankAdjustment
  // But this is the wrong approach because the cash OB journal is already created.
  // Let me just update the Reserves & Surplus entries to balance.

  // Actually, let me take a simpler approach. Let me update the cash OB journal:
  if (Math.abs(correctCashOB - cashOBNeeded) > 0.01) {
    const cashOBDiff = correctCashOB - cashOBNeeded;
    if (cashOBDiff > 0) {
      await createVoucher('JOURNAL', '2023-04-01', [
        makeEntry('Cash-in-Hand', Math.abs(cashOBDiff), 'DEBIT'),
        makeEntry('Reserves & Surplus', Math.abs(cashOBDiff), 'CREDIT'),
      ], 'Cash OB adjustment');
    } else {
      await createVoucher('JOURNAL', '2023-04-01', [
        makeEntry('Reserves & Surplus', Math.abs(cashOBDiff), 'DEBIT'),
        makeEntry('Cash-in-Hand', Math.abs(cashOBDiff), 'CREDIT'),
      ], 'Cash OB adjustment (reduce)');
    }
    console.log('  Cash OB adjusted by:', cashOBDiff.toFixed(2));
  }

  // ── FINAL: Reserves & Surplus Verification ──
  // Reserves OB = 3771 (set in ledger)
  // Credits from journals: 71280.60 (bank OB) + cashOBNeeded + cashOBAdj + 30493 (DTA)
  // Debits from journals: none additional
  // P&L net loss = -48963 (will auto-compute from income - expense vouchers)
  // The Reserves & Surplus closing should be = OB 3771 + net from journals (OBs) 
  // But in BS, Reserves = 3771 + current year net = 3771 - 48963 = -45192
  // The journal entries for cash OB and bank OB are loading Reserves with the opening balances of those assets.
  // This is correct because in double-entry, the prev year balance sheet must balance:
  //   Assets OB = Liabilities OB + Capital OB
  //   Cash OB + Bank OB + Fixed Assets OB = Share Capital + Reserves + ...
  //   The excess goes to Reserves (which represents accumulated profits/retained earnings)
  
  // Let me verify the total Reserves & Surplus credits from journals:
  const reserveCredits = 71280.60 + cashOBNeeded + (correctCashOB - cashOBNeeded) + 30493;
  const reserveDebits = 0;
  console.log('  Reserves journal credits:', reserveCredits.toFixed(2));
  console.log('  Reserves OB:', PREV_YEAR_PROFIT);
  // Opening BS (April 1, 2023): 
  // Assets: Fixed Assets 679100 + Cash OB + Bank 71280.60 = 
  // These OB journal entries are essentially saying:
  // "The assets from last year came from equity (Reserves & Surplus)"
  // This is a simplification. Let's verify the April 1 balance sheet:
  // Assets: Fixed 679100 + Cash (correctCashOB) + Bank 71280.60 + Fees Recv 0 + Advances 0 + DTA 0
  // = 679100 + correctCashOB + 71280.60
  // Equity: Share Capital 610000 + Reserves 3771 + Liabilities 0 + Provisions 0 + OCL 0
  // For OB to balance: 679100 + correctCashOB + 71280.60 = 610000 + 3771 + (reserves from journals)
  // reserves from journals = 679100 + correctCashOB + 71280.60 - 610000 - 3771
  // But we already have Fixed Assets OB = 679100 in the ledger, which creates a debit automatically.
  // The journal entries for Cash OB and Bank OB credit Reserves.
  // So: Reserves OB 3771 + journal credits = closing of Reserves excluding P&L
  // The 679100 is just the ledger OB, not a journal. So it doesn't affect Reserves.
  // Similarly Share Capital 610000 is just ledger OB.
  // For the opening BS (ledger OBs only):
  //   Asset OBs: Fixed 679100 (Dr)
  //   Capital OBs: Share Capital 610000 (Cr) + Reserves 3771 (Cr) = 613771
  //   Gap: 679100 - 613771 = 65329
  //   This gap needs to be funded. Other OB items from prev year:
  //   - Bank 71280.60 (we're adding via journal)
  //   - Cash: some amount (adding via journal)
  //   - OCL, Provisions etc from prev year: unknown
  // 
  // Actually this approach of using journal entries for OBs is getting complex.
  // Let me use a MUCH simpler approach: Set ALL ledger opening balances correctly,
  // and only use vouchers for CURRENT YEAR transactions.

  console.log('\n--- Approach is getting complex. Let me use a cleaner strategy. ---');
  console.log('  Deleting all data and re-seeding with opening balances on ledgers...');

  // CLEAR AND REDO
  await db.collection('acc_vouchers').deleteMany({ financialYear: FY });
  await db.collection('acc_ledgers').deleteMany({ financialYear: FY });
  voucherCount = 0;

  // ═══════════════════════════════════════════════════
  // STRATEGY 2: Opening Balances + Annual Journal Entries
  // ═══════════════════════════════════════════════════
  
  // For a CA report match, the simplest approach is:
  // 1. Set opening balances for all BS items as of April 1, 2023 (from prev year closing)
  // 2. Create P&L journal entries for the year's income/expense
  // 3. Create BS adjustment journals for items that changed during the year
  
  // Opening BS (April 1, 2023) - derived from closing BS minus current year changes:
  // Fixed Assets Opening = 679100 (gross block - same as closing since no new additions)
  // Cash Opening = ?
  // Bank Opening = 71280.60
  // In the CA report, prev year figures for BS would tell us, but we don't have them.
  // What we know: Share Capital 610000 existed from start, Reserves = 3771 at start.
  
  // The CA report previous year column shows:
  // Revenue 716.00 (hundreds) = 71600
  // That's all we know about prev year.
  // Let's work backwards from the closing BS:
  
  // Closing BS:
  // Fixed Assets Net: 397719
  // Cash: 291886
  // Bank: 37441
  // Fees Receivable: 111769
  // Sundry Advances: 28000
  // DTA: 30493
  // Total Assets: 866815 (wait: 397719+291886+37441+111769+28000+30493 = 897308... not 866815!)
  // Hmm, that's 897308 not 866815. Difference = 30493 which is the DTA.
  // In the CA report, DTA is shown as negative under Deferred Tax Liability on the liability side.
  // So Total Assets = 397719 + 291886 + 37441 + 111769 + 28000 = 866815 ✓ (without DTA)
  // And DTA is netted on the Eq+Liab side: 610000 - 45192 - 30493 + 7500 + 325000 = 866815 ✓
  
  // So DTA is NOT an asset in this report format - it's shown as negative liability.
  // Let me model it that way for the BS to match.
  
  // For simplicity, since we want to match the CA report EXACTLY, let me set
  // the closing balances directly using opening balances and minimal vouchers.
  
  // Opening balances of BS items (April 1, 2023):
  // We know prev year profit = 3771, so prev year closing BS had Reserves = 3771.
  // The CS report only shows current year, so we need to infer opening balances.
  // Opening Assets = Opening Equity + Liabilities
  // We don't have full opening data, but we can construct it.
  
  // SIMPLEST APPROACH FOR PERFECT CA MATCH:
  // Use income/expense ledgers with 0 OB and annual totals via vouchers.
  // Use BS ledgers with opening balances set to their CLOSING values,
  // MINUS any changes we model via vouchers.
  // OR: Just set closing values directly on BS ledgers and skip the voucher approach for BS.
  // 
  // Actually, the engine computes P&L from INCOME and EXPENSE ledger balances (OB + vouchers).
  // And BS from ASSET, LIABILITY, CAPITAL ledger balances.
  // So the SIMPLEST way to match CA report is:
  //   Income/Expense: Use JOURNAL entries for exact amounts → P&L auto-computes
  //   BS items: Set opening balance = closing balance on each ledger → BS shows those values
  //   The P&L net loss will auto-flow to BS via the engine's generateBalanceSheet()
  
  // Let's do this! ✅
  
  console.log('\n=== CLEAN APPROACH: OB for BS + Journals for P&L ===\n');
  
  const cleanLedgers = [
    // INCOME (P&L items - no OB, amounts come from vouchers)
    { name: 'Course Fees', group: 'INCOME', subGroup: 'Direct Incomes', ob: 0, obType: 'CREDIT' },
    { name: 'Other Income', group: 'INCOME', subGroup: 'Indirect Incomes', ob: 0, obType: 'CREDIT' },

    // EXPENSES (P&L items - no OB, amounts come from vouchers)
    ...Object.keys(ADMIN_EXPENSES).map(n => ({ name: n, group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: 0, obType: 'DEBIT' })),
    ...Object.keys(DEPRECIATION).map(n => ({ name: n, group: 'EXPENSE', subGroup: 'Depreciation', ob: 0, obType: 'DEBIT' })),

    // BS items - set OB = CLOSING balance from CA report
    { name: 'Fixed Assets (Net Block)', group: 'ASSET', subGroup: 'Fixed Assets', ob: NET_FIXED_ASSETS, obType: 'DEBIT' },
    { name: 'Cash-in-Hand', group: 'ASSET', subGroup: 'Cash-in-Hand', ob: CASH_IN_HAND, obType: 'DEBIT' },
    { name: 'Kotak Mahindra Bank', group: 'ASSET', subGroup: 'Bank Accounts', ob: BANK_BALANCE, obType: 'DEBIT' },
    { name: 'Fees Receivable', group: 'ASSET', subGroup: 'Sundry Debtors', ob: FEES_RECEIVABLE, obType: 'DEBIT' },
    { name: 'Sundry Advances', group: 'ASSET', subGroup: 'Current Assets', ob: SUNDRY_ADVANCES, obType: 'DEBIT' },

    // CAPITAL
    { name: 'Share Capital', group: 'CAPITAL', subGroup: 'Share Capital', ob: SHARE_CAPITAL, obType: 'CREDIT' },
    // Reserves: Use closing value 45192 as DEBIT (accumulated loss)
    // Actually, Reserves OB = 3771 (credit). Current year P&L = -48963 will auto-compute.
    // So Reserves closing = 3771 - 48963 = -45192     (meaning OB credit 3771, but P&L loss reduces it)
    // The engine's BS does: capital balance + Net Profit 
    // If Reserves OB = 3771 (Credit) and no voucher debits it, its balance stays 3771.
    // Then the BS adds P&L -48963, giving Reserves + P&L = 3771 - 48963 = -45192 ✓
    // But wait, the engine shows capital items from their ledger balance, not Reserves + P&L combined.
    // Let me check how the engine does it...
    // In generateBalanceSheet(), it gets capital ledger balances AND adds P&L to capitalAdjusted.
    // So Reserves ledger will show 3771, and the "Net Profit" line will show -48963.
    // The CA report combines them as "Reserves & Surplus: -45192"
    // That means displaying Reserves & Surplus requires the P&L to flow in.
    // This is standard - the BS shows: Reserves & Surplus = OB + Current Year P&L
    
    { name: 'Reserves & Surplus', group: 'CAPITAL', subGroup: 'Reserves & Surplus', ob: PREV_YEAR_PROFIT, obType: 'CREDIT' },
    // OB 3771 + P&L (-48963) = -45192 ✓

    // LIABILITIES
    { name: 'Deferred Tax Liability', group: 'LIABILITY', subGroup: 'Current Liabilities', ob: DEFERRED_TAX_CREDIT, obType: 'DEBIT' },
    // DTA shown as negative liability: -30493. In our system, a liability with DEBIT balance = negative liability.
    // So OB = 30493, Type = DEBIT means it's a debit (contra) balance on a liability → negative liability ✓
    
    { name: 'Short-Term Provisions', group: 'LIABILITY', subGroup: 'Provisions', ob: SHORT_TERM_PROVISIONS, obType: 'CREDIT' },
    { name: 'Other Current Liabilities', group: 'LIABILITY', subGroup: 'Current Liabilities', ob: OTHER_CURRENT_LIABILITIES, obType: 'CREDIT' },
  ];

  // Clear the ledgerMap
  for (const k of Object.keys(ledgerMap)) delete ledgerMap[k];
  
  for (const ld of cleanLedgers) {
    const doc = {
      name: ld.name,
      group: ld.group,
      subGroup: ld.subGroup,
      openingBalance: ld.ob,
      openingBalanceType: ld.obType,
      financialYear: FY,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('acc_ledgers').insertOne(doc);
    ledgerMap[ld.name] = result.insertedId;
  }
  console.log('Created', cleanLedgers.length, 'ledgers');

  // ── P&L JOURNAL ENTRIES ──
  // Income entries: Credit income, Debit a balancing account
  // For income, we debit an asset (Bank/Cash) and credit income.
  // But since BS items have closing OBs, we don't want bank/cash to change via vouchers.
  // Solution: Use a "P&L Suspense" approach - the income/expense vouchers internally balance.
  // Actually, the simplest: Create a single JOURNAL entry for each P&L line,
  // debiting expense and crediting a "P&L Account" ledger, and 
  // crediting income and debiting "P&L Account".
  // The P&L Account will net to zero (or to the net profit/loss).
  // But this creates an artificial ledger.
  
  // Even simpler: Use paired income <-> expense journals.
  // Total Income = 723722, Total Expense = 803178. 
  // Create: Dr Expense / Cr Income for 723722 (fully absorb income)
  // Then: Dr Expense(remaining) / Cr Retained Earnings for 79456 (the loss)
  // But this doesn't match the engine's logic which expects voucher entries to have real counterparts.
  
  // Actually, the CORRECT accounting approach:
  // Income is earned via RECEIPT/SALES vouchers: Dr Bank/Cash, Cr Income
  // Expenses are paid via PAYMENT vouchers: Dr Expense, Cr Bank/Cash
  // But since bank/cash OBs are set to closing values, any voucher touching them would change the closing.
  // 
  // To avoid that, I need to either:
  // a) Use OBs that represent OPENING (not closing) and let vouchers compute the closing, or
  // b) Use a transfer account
  //
  // Option (a) is the correct approach but requires knowing the opening balances.
  // Since we don't know exact opening balances for cash, fees receivable, etc.,
  // let's use a hybrid:
  
  // APPROACH 3: Compute opening balances from closing - movements
  
  // Movements:
  // Course Fees: 703570 comes IN (to cash/bank/receivable)
  // Other Income: 20152 comes IN  
  // Admin Expenses: 521797 goes OUT
  // Depreciation: 281381 (non-cash, reduces fixed assets)
  // Deferred Tax: 30493 (non-cash)
  
  // Asset movements:
  // Fixed Assets: No additions in the year, depreciation reduces by 281381
  //   Opening = Closing + Depreciation = 397719 + 281381 = 679100
  // Bank: We know OB = 71280.60, CB = 37441
  //   Movement = -33839.60
  // Cash-in-Hand: We need to figure out OB
  //   Cash receives = Course fees cash portion + Other income cash portion
  //   Cash pays = Admin expenses cash portion
  //   Without exact split, we can't determine cash OB.
  //   But we know: Revenue total = 703570 + 20152 = 723722
  //   Bank net movement = -33840 (money left the bank more than came in)
  //   Fees Receivable closing = 111769 (these haven't been collected yet)
  //   So: Cash received from revenue = 723722 - bank portion of revenue - fees receivable
  //   We need the bank portion of revenue. From bank analysis:
  //   Bank deposits for course fees ≈ 199501, other income ≈ 5920
  //   Revenue via bank = 205421
  //   Revenue via cash = 723722 - 205421 - 111769 = 406532
  //   
  //   Cash paid for expenses:
  //   Bank payments for expenses ≈ 56409 (from bank analysis)
  //   Cash payments for expenses = 521797 - 56409 = 465388
  //   
  //   Net cash from operations = 406532 - 465388 = -58856
  //   Cash OB = Cash closing - net cash = 291886 - (-58856) = 350742
  //   Hmm, that's a lot. But there are also director payments, dividends etc from bank.
  //   Let me include all bank movements.
  //   
  //   Total bank deposits = some amount. Total bank withdrawals = some amount.
  //   Bank CB = Bank OB + deposits - withdrawals
  //   37441 = 71280.60 + deposits - withdrawals  
  //   deposits - withdrawals = -33839.60
  //   
  //   The revenue and expense amounts are the TOTAL for the company (bank + cash + non-cash).
  //   Bank movement = -33840 means bank contributed net negative.
  //   Cash must make up the rest.
  //   
  //   Total asset changes (excluding Fixed Assets & depreciation):
  //   Cash change = Cash CB - Cash OB
  //   Bank change = -33840
  //   Fees Recv change = +111769 (was 0 at start? Or some amount?)
  //   Advances change = +28000 (was 0?)
  //   DTA change = +30493
  //   
  //   Capital changes:
  //   Share Capital: no change (610000 → 610000)
  //   Reserves: 3771 → -45192 = change of -48963 (= net loss)
  //   
  //   Liability changes:
  //   DT Liability: unclear
  //   Provisions: ? → 7500
  //   OCL: ? → 325000
  
  // This is getting too complex without prev year BS. Let me use a PRAGMATIC approach:
  // Set everything up so the P&L matches exactly, and BS matches exactly,
  // using the most straightforward method.

  // FINAL APPROACH: P&L Transfer Account
  // Create a "P&L Transfer Account" (Capital) that acts as the contra for all P&L entries.
  // Income: Dr P&L Transfer, Cr Income ledger → Income shows in P&L ✓
  // Expense: Dr Expense ledger, Cr P&L Transfer → Expense shows in P&L ✓  
  // Net balance of P&L Transfer = Net Income - Net Expense = Net Loss (-48963)
  // This P&L Transfer account's balance represents the current year profit/loss.
  // In BS, it will show as part of Capital section.
  // But we DON'T want P&L Transfer to show separately in BS - we want P&L to auto-flow.
  // 
  // The engine's generateBalanceSheet() already auto-adds P&L to capitalAdjusted.
  // So if P&L Transfer has a balance, it would DOUBLE-COUNT.
  // 
  // To avoid double-counting: Make P&L Transfer a CAPITAL ledger with subGroup "Surplus from P&L A/c"
  // Then in BS it will show as a capital item, and the auto-P&L addition should NOT happen.
  // Actually, the engine always adds P&L. So having P&L Transfer as capital AND auto-P&L would double-count.
  // 
  // OK, new plan: Use Cash-in-Hand as the contra account for ALL P&L entries.
  // Then adjust Cash-in-Hand opening balance so closing = 291886.
  // This way:
  //   Cash OB + Revenue(cash) - Expenses(cash) = 291886
  //   Cash OB = 291886 - Revenue(cash) + Expenses(cash) 
  //   But we also need Bank and other items...
  //
  // ENOUGH complexity! Let me use the cleanest possible approach:
  // Set OB = CLOSING for ALL ledgers, and create NO vouchers.
  // This makes P&L = 0 (no income/expense vouchers) and BS = closing values.
  // But then P&L won't show anything...
  
  // FINAL FINAL APPROACH:
  // 1. INCOME ledgers: Set OB = annual amount with CREDIT type
  //    → P&L engine: Income = (OB Credit + voucher Credit) - (OB Debit + voucher Debit)  
  //    → With OB = 703570 Credit and no vouchers: Income = 703570 ✓
  // 2. EXPENSE ledgers: Set OB = annual amount with DEBIT type
  //    → P&L engine: Expense = (OB Debit + voucher Debit) - (OB Credit + voucher Credit)
  //    → With OB = 52500 Debit and no vouchers: Expense = 52500 ✓
  // 3. BS ledgers: Set OB = closing balance
  //    → BS shows closing values directly ✓
  // 
  // This is the simplest approach! NO VOUCHERS NEEDED!
  // The engine treats OB as part of the balance calculation.
  // P&L items: OB acts as the total annual amount.
  // BS items: OB acts as the closing balance.
  
  // But wait - this is semantically weird. Opening balance of income = annual income?
  // In Tally Prime, this is actually how historical data is entered - as opening balances.
  // When you start Tally mid-year, you enter all historical data as opening balances.
  // So this is valid!
  
  console.log('  *** USING OB-ONLY APPROACH (no vouchers needed) ***');
  
  // Clear again
  await db.collection('acc_ledgers').deleteMany({ financialYear: FY });
  for (const k of Object.keys(ledgerMap)) delete ledgerMap[k];
  
  const finalLedgers = [
    // === INCOME (OB = annual total) ===
    { name: 'Course Fees', group: 'INCOME', subGroup: 'Direct Incomes', ob: COURSE_FEES, obType: 'CREDIT' },
    { name: 'Other Income', group: 'INCOME', subGroup: 'Indirect Incomes', ob: OTHER_INCOME, obType: 'CREDIT' },
    { name: 'Deferred Tax Benefit', group: 'INCOME', subGroup: 'Indirect Incomes', ob: DEFERRED_TAX_CREDIT, obType: 'CREDIT' },
    // DT Benefit = 30493 reduces loss: Pre-tax loss -79456 + 30493 = Net loss -48963

    // === EXPENSES (OB = annual total) ===
    ...Object.entries(ADMIN_EXPENSES).map(([name, amt]) => ({
      name, group: 'EXPENSE', subGroup: 'Indirect Expenses', ob: amt, obType: 'DEBIT'
    })),
    ...Object.entries(DEPRECIATION).map(([name, amt]) => ({
      name, group: 'EXPENSE', subGroup: 'Depreciation', ob: amt, obType: 'DEBIT'
    })),

    // === ASSETS (OB = closing balance) ===
    { name: 'Fixed Assets (Net Block)', group: 'ASSET', subGroup: 'Fixed Assets', ob: NET_FIXED_ASSETS, obType: 'DEBIT' },
    { name: 'Cash-in-Hand', group: 'ASSET', subGroup: 'Cash-in-Hand', ob: CASH_IN_HAND, obType: 'DEBIT' },
    { name: 'Kotak Mahindra Bank', group: 'ASSET', subGroup: 'Bank Accounts', ob: BANK_BALANCE, obType: 'DEBIT' },
    { name: 'Fees Receivable', group: 'ASSET', subGroup: 'Sundry Debtors', ob: FEES_RECEIVABLE, obType: 'DEBIT' },
    { name: 'Sundry Advances', group: 'ASSET', subGroup: 'Current Assets', ob: SUNDRY_ADVANCES, obType: 'DEBIT' },

    // === CAPITAL ===
    { name: 'Share Capital', group: 'CAPITAL', subGroup: 'Share Capital', ob: SHARE_CAPITAL, obType: 'CREDIT' },
    { name: 'Reserves & Surplus', group: 'CAPITAL', subGroup: 'Reserves & Surplus', ob: PREV_YEAR_PROFIT, obType: 'CREDIT' },
    // Reserves OB = 3771. P&L net loss (-48963) will auto-flow via generateBalanceSheet().
    // So Reserves in BS = 3771 + (-48963) = -45192 ✓

    // === LIABILITIES ===
    { name: 'Deferred Tax Liability', group: 'LIABILITY', subGroup: 'Current Liabilities', ob: DEFERRED_TAX_CREDIT, obType: 'DEBIT' },
    { name: 'Short-Term Provisions', group: 'LIABILITY', subGroup: 'Provisions', ob: SHORT_TERM_PROVISIONS, obType: 'CREDIT' },
    { name: 'Other Current Liabilities', group: 'LIABILITY', subGroup: 'Current Liabilities', ob: OTHER_CURRENT_LIABILITIES, obType: 'CREDIT' },
  ];

  // Build group name → ObjectId map for auto-linking
  const allGroups = await db.collection('acc_groups').find({ financialYear: FY }).toArray();
  const groupNameToId = {};
  for (const g of allGroups) groupNameToId[g.name] = g._id;
  console.log('  Group map loaded:', Object.keys(groupNameToId).length, 'groups');

  for (const ld of finalLedgers) {
    const doc = {
      name: ld.name,
      group: ld.group,
      subGroup: ld.subGroup,
      groupId: groupNameToId[ld.subGroup] || null, // auto-link to group
      openingBalance: ld.ob,
      openingBalanceType: ld.obType,
      financialYear: FY,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('acc_ledgers').insertOne(doc);
    ledgerMap[ld.name] = result.insertedId;
  }
  console.log('  Created', finalLedgers.length, 'ledgers with exact closing/annual values (auto-linked to groups)');

  // ── VERIFY P&L ──
  console.log('\n=== P&L VERIFICATION ===');
  let totalInc = 0, totalExp = 0;
  for (const ld of finalLedgers.filter(l => l.group === 'INCOME')) {
    console.log('  Income: ' + ld.name + ' = ' + ld.ob);
    totalInc += ld.ob;
  }
  console.log('  Total Income:', totalInc, '| Target:', TOTAL_REVENUE, '| Match:', totalInc === TOTAL_REVENUE ? '✅' : '❌');
  
  for (const ld of finalLedgers.filter(l => l.group === 'EXPENSE')) {
    totalExp += ld.ob;
  }
  console.log('  Total Expenses:', totalExp, '| Target:', TOTAL_EXPENSES, '| Match:', totalExp === TOTAL_EXPENSES ? '✅' : '❌');
  console.log('  Net P&L:', totalInc - totalExp, '| Target:', TOTAL_REVENUE - TOTAL_EXPENSES, '| Match:', (totalInc - totalExp) === (TOTAL_REVENUE - TOTAL_EXPENSES) ? '✅' : '❌');

  // ── VERIFY BS ──
  console.log('\n=== BS VERIFICATION ===');
  let totalA = 0, totalL = 0, totalC = 0;
  for (const ld of finalLedgers.filter(l => l.group === 'ASSET')) {
    totalA += ld.ob;
    console.log('  Asset: ' + ld.name + ' = ' + ld.ob);
  }
  console.log('  Total Assets:', totalA, '| Target:', TOTAL_ASSETS, '| Match:', totalA === TOTAL_ASSETS ? '✅' : '❌');
  
  for (const ld of finalLedgers.filter(l => l.group === 'LIABILITY')) {
    if (ld.obType === 'DEBIT') totalL -= ld.ob; // Negative liability
    else totalL += ld.ob;
    console.log('  Liability: ' + ld.name + ' = ' + (ld.obType === 'DEBIT' ? '-' : '') + ld.ob);
  }
  console.log('  Net Liabilities:', totalL);
  
  for (const ld of finalLedgers.filter(l => l.group === 'CAPITAL')) {
    totalC += ld.ob;
    console.log('  Capital: ' + ld.name + ' = ' + ld.ob);
  }
  console.log('  Total Capital (before P&L):', totalC);
  
  const netPL = totalInc - totalExp;
  const capitalAdjusted = totalC + netPL;
  const eqPlusLiab = capitalAdjusted + totalL;
  console.log('  Capital adjusted (+ P&L ' + netPL + '):', capitalAdjusted);
  console.log('  Equity + Liabilities:', eqPlusLiab, '| Target:', TOTAL_ASSETS);
  console.log('  BS Balanced:', Math.abs(totalA - eqPlusLiab) < 1 ? '✅' : '❌');
  
  // ── SUMMARY ──
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║        FY 2023-24 SEEDING COMPLETE          ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║ Ledgers:    ' + finalLedgers.length + ' created                     ║');
  console.log('║ Groups:     ' + groupDocs.length + ' created                     ║');
  console.log('║ P&L Match:  ' + (totalInc === TOTAL_REVENUE && totalExp === TOTAL_EXPENSES ? '✅ PASS' : '❌ FAIL') + '                          ║');
  console.log('║ BS Match:   ' + (Math.abs(totalA - eqPlusLiab) < 1 ? '✅ PASS' : '❌ FAIL') + '                          ║');
  console.log('╚══════════════════════════════════════════════╝');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
