// Comprehensive CA Report match check for FY 2023-24
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryogaDB');

  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();

  console.log('Ledgers:', ledgers.length, '| Vouchers:', vouchers.length);

  // P&L
  const income = ledgers.filter(l => l.group === 'INCOME');
  const expense = ledgers.filter(l => l.group === 'EXPENSE');

  console.log('\n=== PROFIT & LOSS FY 2023-24 ===');
  console.log('\nINCOME:');
  let totalIncome = 0;
  income.forEach(l => {
    totalIncome += l.openingBalance;
    console.log('  ' + l.name.padEnd(40) + ' Rs ' + l.openingBalance.toFixed(2));
  });
  console.log('  ' + 'TOTAL INCOME'.padEnd(40) + ' Rs ' + totalIncome.toFixed(2));

  console.log('\nEXPENSES:');
  let totalExpense = 0;
  expense.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    totalExpense += l.openingBalance;
    console.log('  ' + l.name.padEnd(40) + ' Rs ' + l.openingBalance.toFixed(2));
  });
  console.log('  ' + 'TOTAL EXPENSES'.padEnd(40) + ' Rs ' + totalExpense.toFixed(2));

  const netPL = totalIncome - totalExpense;
  console.log('\n  NET: Rs ' + netPL.toFixed(2) + (netPL >= 0 ? ' (Profit)' : ' (Loss)'));

  // Revenue excl DT benefit  
  const dtBenefit = income.find(l => l.name.includes('Deferred Tax'));
  const revExclDT = totalIncome - (dtBenefit ? dtBenefit.openingBalance : 0);
  console.log('  CA Revenue (excl DT Benefit): Rs ' + revExclDT.toFixed(2));
  console.log('  CA Expected Revenue:          Rs 723722.00');
  console.log('  Match: ' + (Math.abs(revExclDT - 723722) < 1 ? 'YES' : 'NO Diff: ' + (revExclDT - 723722)));

  // Balance Sheet
  const assets = ledgers.filter(l => l.group === 'ASSET');
  const liabilities = ledgers.filter(l => l.group === 'LIABILITY');
  const capital = ledgers.filter(l => l.group === 'CAPITAL');

  console.log('\n=== BALANCE SHEET FY 2023-24 ===');

  console.log('\nASSETS:');
  let totalAssets = 0;
  assets.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    const val = l.openingBalanceType === 'DEBIT' ? l.openingBalance : -l.openingBalance;
    totalAssets += val;
    console.log('  ' + l.name.padEnd(40) + ' Rs ' + l.openingBalance.toFixed(2) + ' ' + l.openingBalanceType);
  });
  console.log('  ' + 'TOTAL ASSETS'.padEnd(40) + ' Rs ' + totalAssets.toFixed(2));

  console.log('\nLIABILITIES:');
  let totalLiab = 0;
  liabilities.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    const val = l.openingBalanceType === 'CREDIT' ? l.openingBalance : -l.openingBalance;
    totalLiab += val;
    console.log('  ' + l.name.padEnd(40) + ' Rs ' + l.openingBalance.toFixed(2) + ' ' + l.openingBalanceType);
  });
  console.log('  ' + 'TOTAL LIABILITIES'.padEnd(40) + ' Rs ' + totalLiab.toFixed(2));

  console.log('\nCAPITAL:');
  let totalCap = 0;
  capital.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
    const val = l.openingBalanceType === 'CREDIT' ? l.openingBalance : -l.openingBalance;
    totalCap += val;
    console.log('  ' + l.name.padEnd(40) + ' Rs ' + l.openingBalance.toFixed(2) + ' ' + l.openingBalanceType);
  });
  console.log('  ' + 'TOTAL CAPITAL'.padEnd(40) + ' Rs ' + totalCap.toFixed(2));

  const liabPlusCap = totalLiab + totalCap;
  const rhsTotal = liabPlusCap + netPL;

  console.log('\n--- BS CHECK ---');
  console.log('  Total Assets:      Rs ' + totalAssets.toFixed(2));
  console.log('  Liab + Capital:    Rs ' + liabPlusCap.toFixed(2));
  console.log('  P&L (loss):        Rs ' + netPL.toFixed(2));
  console.log('  RHS (L+C+PL):      Rs ' + rhsTotal.toFixed(2));
  console.log('  Balanced: ' + (Math.abs(totalAssets - rhsTotal) < 1 ? 'YES' : 'NO Diff: ' + (totalAssets - rhsTotal)));
  console.log('  CA Expected BS:    Rs 866815.00');
  console.log('  Match: ' + (Math.abs(totalAssets - 866815) < 1 ? 'YES' : 'NO Diff: ' + (totalAssets - 866815)));

  // Trial Balance
  let tbDebit = 0, tbCredit = 0;
  ledgers.forEach(l => {
    if (l.openingBalanceType === 'DEBIT') tbDebit += l.openingBalance;
    else tbCredit += l.openingBalance;
  });
  console.log('\n--- TRIAL BALANCE ---');
  console.log('  Total Debit:   Rs ' + tbDebit.toFixed(2));
  console.log('  Total Credit:  Rs ' + tbCredit.toFixed(2));
  console.log('  Balanced: ' + (Math.abs(tbDebit - tbCredit) < 1 ? 'YES' : 'NO Diff: ' + (tbDebit - tbCredit)));

  await client.close();
})();
