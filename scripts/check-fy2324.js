// Check FY 2023-24 enterprise data vs CA report
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryogaDB');

  // Enterprise system
  const accLedgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  const accVouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();
  const accGroups = await db.collection('acc_groups').find({}).toArray();
  const accFY = await db.collection('acc_financial_years').find({}).toArray();

  console.log('=== ENTERPRISE FY 2023-24 ===');
  console.log('Financial Years:', accFY.map(f => `${f.code} (closed: ${f.isClosed})`).join(', '));
  console.log('Ledgers:', accLedgers.length);
  console.log('Vouchers:', accVouchers.length);
  console.log('Groups:', accGroups.length);

  // Group ledgers by account group
  const byGroup = {};
  accLedgers.forEach(l => {
    if (!byGroup[l.group]) byGroup[l.group] = [];
    byGroup[l.group].push(l);
  });

  let totalDebit = 0, totalCredit = 0;
  for (const [group, items] of Object.entries(byGroup)) {
    console.log(`\n── ${group} (${items.length}) ──`);
    let groupTotal = 0;
    items.sort((a, b) => a.name.localeCompare(b.name)).forEach(l => {
      const ob = l.openingBalance || 0;
      const type = l.openingBalanceType || 'DEBIT';
      if (type === 'DEBIT') totalDebit += ob;
      else totalCredit += ob;
      groupTotal += (type === 'DEBIT' ? ob : -ob);
      console.log(`  ${l.name.padEnd(45)} | ${l.subGroup || ''.padEnd(20)} | ${ob.toFixed(2).padStart(12)} ${type}`);
    });
    console.log(`  ${''.padEnd(45)} | SUBTOTAL: ${groupTotal.toFixed(2)}`);
  }

  console.log('\n=== TRIAL BALANCE CHECK ===');
  console.log('Total Debit OBs:', totalDebit.toFixed(2));
  console.log('Total Credit OBs:', totalCredit.toFixed(2));
  console.log('Difference:', (totalDebit - totalCredit).toFixed(2));

  // P&L summary
  const income = accLedgers.filter(l => l.group === 'INCOME');
  const expense = accLedgers.filter(l => l.group === 'EXPENSE');
  const totalIncome = income.reduce((s, l) => s + (l.openingBalance || 0), 0);
  const totalExpense = expense.reduce((s, l) => s + (l.openingBalance || 0), 0);
  console.log('\n=== P&L (from OBs, no vouchers) ===');
  console.log('Total Income:', totalIncome.toFixed(2));
  console.log('Total Expense:', totalExpense.toFixed(2));
  console.log('Net:', (totalIncome - totalExpense).toFixed(2));

  // BS summary
  const assets = accLedgers.filter(l => l.group === 'ASSET');
  const liabilities = accLedgers.filter(l => l.group === 'LIABILITY');
  const capital = accLedgers.filter(l => l.group === 'CAPITAL');
  const totalAssets = assets.reduce((s, l) => s + (l.openingBalance || 0), 0);
  const totalLiab = liabilities.reduce((s, l) => s + (l.openingBalance || 0), 0);
  const totalCap = capital.reduce((s, l) => s + (l.openingBalance || 0), 0);
  console.log('\n=== BS (from OBs) ===');
  console.log('Total Assets (Dr):', totalAssets.toFixed(2));
  console.log('Total Liabilities (Cr):', totalLiab.toFixed(2));
  console.log('Total Capital (Cr):', totalCap.toFixed(2));
  console.log('Liab + Cap:', (totalLiab + totalCap).toFixed(2));
  console.log('P&L Net (Income-Expense):', (totalIncome - totalExpense).toFixed(2));
  console.log('Liab + Cap + P&L:', (totalLiab + totalCap + totalIncome - totalExpense).toFixed(2));
  console.log('Assets:', totalAssets.toFixed(2));
  console.log('Balanced?', Math.abs(totalAssets - (totalLiab + totalCap + totalIncome - totalExpense)) < 0.01);

  // CA Report comparison
  console.log('\n=== CA REPORT EXPECTED ===');
  console.log('Revenue: 7,23,722');
  console.log('Expenses: 8,03,178');
  console.log('Net Loss: 48,963 (Wait, 803178-723722 = 79,456?)');
  console.log('Total BS: 8,66,815');

  await client.close();
})();
