const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const col = c.db('swaryoga_admin_crm').collection('tally_manual_balances');
  const all = await col.find({ financialYear: '2024-25' }).toArray();

  // Exactly mimic what buildBSFromManual does
  const incomeEntries = all.filter(e => e.category === 'income' || e.category === 'Income');
  const expenseEntries = all.filter(e =>
    e.category === 'expense' || e.category === 'Indirect Expenses' || e.category === 'Direct Expenses'
  );
  const totalIncome = incomeEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
  const currentYearPL = totalIncome - totalExpenses;

  console.log('=== AUTO P&L INJECTION CHECK ===');
  console.log('Income entries:', incomeEntries.length, '= Rs', totalIncome);
  console.log('Expense entries:', expenseEntries.length, '= Rs', totalExpenses);
  console.log('Current Year P&L:', currentYearPL, (currentYearPL < 0 ? '(LOSS)' : '(PROFIT)'));

  // BS calculation
  const assets = all.filter(e => e.category === 'asset');
  const liabs = all.filter(e => e.category === 'liability');

  let ta = 0;
  assets.forEach(e => ta += e.amount);

  // Net liabilities (Cr positive, Dr negative)
  let nl = 0;
  liabs.forEach(e => {
    if (e.drCr === 'Cr') nl += e.amount;
    else nl -= e.amount;
  });

  console.log('\n=== BS BEFORE Auto P&L ===');
  console.log('Assets:', ta);
  console.log('Net Liabilities:', nl);
  console.log('Difference:', ta - nl);

  console.log('\n=== BS AFTER Auto P&L Injection ===');
  const nlWithPL = nl + currentYearPL;
  console.log('Net Liabilities + P&L:', nlWithPL);
  console.log('Difference:', ta - nlWithPL);

  console.log('\n=== Reserves & Surplus with P&L ===');
  const resEntries = all.filter(e => e.parentGroup === 'Reserves & Surplus');
  resEntries.forEach(e => {
    const sign = e.drCr === 'Dr' ? -1 : 1;
    console.log('  ' + e.ledgerName + ': Rs ' + (sign * e.amount));
  });
  console.log('  Current Year Loss: Rs ' + currentYearPL);
  const rTotal = resEntries.reduce((s, e) => s + (e.drCr === 'Dr' ? -e.amount : e.amount), 0) + currentYearPL;
  console.log('  TOTAL Reserves: Rs ' + rTotal);

  console.log('\n=== Bank total check ===');
  console.log('User says total bank debits: Rs 12,85,586.56');
  console.log('P&L expenses in DB: Rs', totalExpenses);
  console.log('Difference (BS items):', 1285586.56 - totalExpenses);
  console.log('  - These went to: Fixed Assets, Resort CWIP, Sundry Advances, EMIs, Dividends');

  await c.close();
})();
