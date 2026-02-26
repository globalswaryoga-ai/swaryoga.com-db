const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const col = client.db('swaryoga_admin_crm').collection('tally_manual_balances');

  const all = await col.find({ financialYear: '2024-25' }).toArray();

  console.log('=== FULL BALANCE SHEET CHECK ===\n');

  // Categorize
  const assets = all.filter(e => e.category === 'asset');
  const liabilities = all.filter(e => e.category === 'liability');
  const income = all.filter(e => e.category === 'income');
  const expenses = all.filter(e => e.category === 'expense');

  console.log('--- ASSETS (Dr) ---');
  let totalAssets = 0;
  assets.sort((a,b) => b.amount - a.amount).forEach(e => {
    console.log(`  ${e.ledgerName.padEnd(40)} ${e.parentGroup.padEnd(25)} ₹${e.amount.toLocaleString('en-IN')} (${e.drCr})`);
    totalAssets += e.amount;
  });
  console.log(`  ${'TOTAL ASSETS'.padEnd(40)} ${''.padEnd(25)} ₹${totalAssets.toLocaleString('en-IN')}`);

  console.log('\n--- LIABILITIES (Cr) ---');
  let totalLiab = 0;
  liabilities.sort((a,b) => b.amount - a.amount).forEach(e => {
    console.log(`  ${e.ledgerName.padEnd(40)} ${e.parentGroup.padEnd(25)} ₹${e.amount.toLocaleString('en-IN')} (${e.drCr})`);
    totalLiab += e.amount;
  });
  console.log(`  ${'TOTAL LIABILITIES'.padEnd(40)} ${''.padEnd(25)} ₹${totalLiab.toLocaleString('en-IN')}`);

  console.log('\n--- INCOME (Cr) ---');
  let totalIncome = 0;
  income.sort((a,b) => b.amount - a.amount).forEach(e => {
    console.log(`  ${e.ledgerName.padEnd(40)} ${e.parentGroup.padEnd(25)} ₹${e.amount.toLocaleString('en-IN')} (${e.drCr})`);
    totalIncome += e.amount;
  });
  console.log(`  ${'TOTAL INCOME'.padEnd(40)} ${''.padEnd(25)} ₹${totalIncome.toLocaleString('en-IN')}`);

  console.log('\n--- EXPENSES (Dr) ---');
  let totalExp = 0;
  expenses.sort((a,b) => b.amount - a.amount).forEach(e => {
    console.log(`  ${e.ledgerName.padEnd(40)} ${e.parentGroup.padEnd(25)} ₹${e.amount.toLocaleString('en-IN')} (${e.drCr})`);
    totalExp += e.amount;
  });
  console.log(`  ${'TOTAL EXPENSES'.padEnd(40)} ${''.padEnd(25)} ₹${totalExp.toLocaleString('en-IN')}`);

  // P&L calculation
  const netPL = totalIncome - totalExp;
  console.log('\n=== P&L SUMMARY ===');
  console.log(`  Total Income:   ₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`  Total Expenses: ₹${totalExp.toLocaleString('en-IN')}`);
  console.log(`  Net P&L:        ₹${netPL.toLocaleString('en-IN')} (${netPL < 0 ? 'LOSS' : 'PROFIT'})`);

  // BS balance check
  // Assets = Liabilities + Capital/Reserves + Current Year P&L
  console.log('\n=== BALANCE SHEET CHECK ===');
  console.log(`  Total Assets:      ₹${totalAssets.toLocaleString('en-IN')}`);
  console.log(`  Total Liabilities: ₹${totalLiab.toLocaleString('en-IN')}`);
  console.log(`  Current Year P&L:  ₹${netPL.toLocaleString('en-IN')} (auto-injected)`);
  const bsLiabSide = totalLiab + netPL;  // netPL is negative for loss, so it reduces liab side
  console.log(`  Liab + P&L:        ₹${bsLiabSide.toLocaleString('en-IN')}`);
  const diff = totalAssets - bsLiabSide;
  console.log(`  DIFFERENCE:        ₹${diff.toLocaleString('en-IN')} ${diff === 0 ? '✅ BALANCED' : '❌ NOT BALANCED'}`);

  // Check specific entries
  console.log('\n=== KEY ENTRIES CHECK ===');
  const check = ['Course Fees', 'Cash Account', 'Amount Payable', 'P&L Account', 'Sundry Advances'];
  for (const name of check) {
    const entries = all.filter(e => e.ledgerName === name);
    if (entries.length === 0) {
      console.log(`  ${name}: NOT FOUND`);
    } else {
      entries.forEach(e => console.log(`  ${name}: ₹${e.amount.toLocaleString('en-IN')} (${e.category}, ${e.parentGroup}, ${e.drCr})`));
    }
  }

  // Check Unsecured Loans group
  console.log('\n=== UNSECURED LOANS GROUP ===');
  const unsecured = all.filter(e => e.parentGroup === 'Unsecured Loans');
  let unsecTotal = 0;
  unsecured.forEach(e => {
    console.log(`  ${e.ledgerName}: ₹${e.amount.toLocaleString('en-IN')} (${e.category}, ${e.drCr})`);
    unsecTotal += e.amount;
  });
  console.log(`  TOTAL Unsecured Loans: ₹${unsecTotal.toLocaleString('en-IN')}`);

  // Check Sundry Creditors
  console.log('\n=== SUNDRY CREDITORS GROUP ===');
  const sc = all.filter(e => e.parentGroup === 'Sundry Creditors');
  let scTotal = 0;
  sc.forEach(e => {
    console.log(`  ${e.ledgerName}: ₹${e.amount.toLocaleString('en-IN')} (${e.category}, ${e.drCr})`);
    scTotal += e.amount;
  });
  console.log(`  TOTAL Sundry Creditors: ₹${scTotal.toLocaleString('en-IN')}`);

  // Check Reserves & Surplus
  console.log('\n=== RESERVES & SURPLUS ===');
  const res = all.filter(e => e.parentGroup === 'Reserves & Surplus');
  let resTotal = 0;
  res.forEach(e => {
    console.log(`  ${e.ledgerName}: ₹${e.amount.toLocaleString('en-IN')} (${e.category}, ${e.drCr})`);
    resTotal += e.amount;
  });
  console.log(`  TOTAL Reserves: ₹${resTotal.toLocaleString('en-IN')}`);

  await client.close();
})();
