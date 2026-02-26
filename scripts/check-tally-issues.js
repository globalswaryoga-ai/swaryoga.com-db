#!/usr/bin/env node
/**
 * Generate actual Tally XML export and analyze for issues
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  const FY = '2023-24';
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: FY, isActive: true }).toArray();
  const groups = await db.collection('acc_groups').find({ financialYear: FY }).toArray();
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: FY, isReversed: { $ne: true } }).toArray();

  console.log(`=== FY ${FY}: ${ledgers.length} ledgers, ${groups.length} groups, ${vouchers.length} vouchers ===\n`);

  // Check 1: Do our custom groups clash with Tally's built-in groups?
  const TALLY_BUILTIN_GROUPS = [
    'Capital Account', 'Current Assets', 'Current Liabilities', 'Direct Expenses',
    'Direct Incomes', 'Fixed Assets', 'Indirect Expenses', 'Indirect Incomes',
    'Investments', 'Loans (Liability)', 'Secured Loans', 'Unsecured Loans',
    'Suspense A/c', 'Misc. Expenses (ASSET)', 'Purchase Accounts', 'Sales Accounts',
    'Cash-in-Hand', 'Bank Accounts', 'Bank OCC A/c', 'Bank OD A/c',
    'Sundry Debtors', 'Sundry Creditors', 'Duties & Taxes', 'Provisions',
    'Reserves & Surplus', 'Stock-in-Hand', 'Deposits (Asset)',
    'Loans & Advances (Asset)', 'Branch / Divisions', 'Primary',
  ];

  const TALLY_SUBGROUP_MAP = {
    'Cash-in-Hand': 'Cash-in-Hand',
    'Bank Accounts': 'Bank Accounts',
    'Fixed Assets': 'Fixed Assets',
    'Current Assets': 'Current Assets',
    'Sundry Debtors': 'Sundry Debtors',
    'Investments': 'Investments',
    'Current Liabilities': 'Current Liabilities',
    'Sundry Creditors': 'Sundry Creditors',
    'Secured Loans': 'Secured Loans',
    'Unsecured Loans': 'Unsecured Loans',
    'Duties & Taxes': 'Duties & Taxes',
    'Provisions': 'Provisions',
    'Direct Incomes': 'Direct Incomes',
    'Indirect Incomes': 'Indirect Incomes',
    'Sales Accounts': 'Sales Accounts',
    'Direct Expenses': 'Direct Expenses',
    'Indirect Expenses': 'Indirect Expenses',
    'Purchase Accounts': 'Purchase Accounts',
    'Admin Expenses': 'Indirect Expenses',
    'Depreciation': 'Indirect Expenses',
    'Capital Account': 'Capital Account',
    'Share Capital': 'Capital Account',
    'Retained Earnings': 'Reserves & Surplus',
    'Capital Reserve': 'Reserves & Surplus',
    'General Reserve': 'Reserves & Surplus',
  };

  const TALLY_GROUP_MAP = {
    ASSET: 'Current Assets',
    LIABILITY: 'Current Liabilities',
    INCOME: 'Income (Direct)',
    EXPENSE: 'Indirect Expenses',
    CAPITAL: 'Capital Account',
  };

  console.log('── ISSUE CHECK 1: Group Conflicts ──');
  for (const g of groups) {
    const parentGroup = TALLY_SUBGROUP_MAP[g.name] || TALLY_GROUP_MAP[g.nature] || 'Primary';
    const isBuiltin = TALLY_BUILTIN_GROUPS.includes(g.name);
    if (isBuiltin) {
      console.log(`  ⚠ GROUP CONFLICT: "${g.name}" matches Tally built-in group! Parent: "${parentGroup}"`);
      console.log(`    → Tally will try to CREATE a group with same name as built-in → ERROR or duplicate!`);
    } else {
      console.log(`  ✓ "${g.name}" → parent: "${parentGroup}" (custom, no conflict)`);
    }
  }

  console.log('\n── ISSUE CHECK 2: Ledger Group Assignments ──');
  for (const l of ledgers) {
    const tallyGroup = l.subGroup
      ? (TALLY_SUBGROUP_MAP[l.subGroup] || l.subGroup)
      : (TALLY_GROUP_MAP[l.group] || 'Sundry Debtors');
    const isBuiltinGroup = TALLY_BUILTIN_GROUPS.includes(tallyGroup);
    if (!isBuiltinGroup) {
      console.log(`  ⚠ "${l.name}" → group "${tallyGroup}" is NOT a Tally built-in! Will it exist?`);
    }
  }

  console.log('\n── ISSUE CHECK 3: Missing Ledgers Referenced in Journals ──');
  const ledgerNames = new Set(ledgers.map(l => l.name));
  if (!ledgerNames.has('Profit & Loss A/c')) {
    console.log(`  ⚠ "Profit & Loss A/c" is referenced in compound journal but NOT in ledger list!`);
    console.log(`    → Tally may auto-create it, but under wrong group or with issues`);
  }
  if (!ledgerNames.has('Capital Account')) {
    console.log(`  ⚠ "Capital Account" is referenced in Year-End transfer but NOT in ledger list!`);
  }

  console.log('\n── ISSUE CHECK 4: Deferred Tax Liability sign ──');
  const dtl = ledgers.find(l => l.name === 'Deferred Tax Liability');
  if (dtl) {
    console.log(`  Deferred Tax Liability: OB=${dtl.openingBalance} type=${dtl.openingBalanceType} group=${dtl.group}`);
    console.log(`  → As LIABILITY with DEBIT type, tallyOB = ${dtl.openingBalance} (positive = debit in Tally)`);
    console.log(`  → But DTL should be Credit (it's a liability)! Check if type is correct.`);
  }

  console.log('\n── ISSUE CHECK 5: Reserves & Surplus subGroup mapping ──');
  const reserves = ledgers.find(l => l.name === 'Reserves & Surplus');
  if (reserves) {
    console.log(`  Reserves & Surplus: group=${reserves.group} subGroup=${reserves.subGroup}`);
    const mapped = TALLY_SUBGROUP_MAP[reserves.subGroup] || reserves.subGroup;
    console.log(`  → Mapped to: "${mapped}"`);
    if (mapped === 'Reserves & Surplus' && TALLY_BUILTIN_GROUPS.includes('Reserves & Surplus')) {
      console.log(`  ✓ Correctly maps to Tally built-in "Reserves & Surplus"`);
    }
  }

  // Summary of what OBs Tally will see
  console.log('\n── SUMMARY: What Tally Will See ──');
  let obDr = 0, obCr = 0;
  for (const l of ledgers) {
    const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';
    const ob = l.openingBalance || 0;
    const tallyOB = isNominal ? 0 : (l.openingBalanceType === 'DEBIT' ? ob : -ob);
    if (tallyOB > 0) obDr += tallyOB;
    else if (tallyOB < 0) obCr += Math.abs(tallyOB);
  }
  console.log(`  OB Debit total:  ${obDr.toFixed(2)}`);
  console.log(`  OB Credit total: ${obCr.toFixed(2)}`);
  console.log(`  OB Difference:   ${(obDr - obCr).toFixed(2)}`);
  console.log(`  → Tally will show "Difference in opening balances" = ${Math.abs(obDr - obCr).toFixed(2)}`);
  console.log(`  → This is expected — the compound journal's P&L A/c entry should absorb it`);
  console.log(`  → BUT only if P&L A/c ledger exists with correct group!`);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
