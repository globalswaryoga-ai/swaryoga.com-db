const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const all = await db.collection('tally_manual_balances').find({ financialYear: '2024-25' }).toArray();

  const incGrps = ['Direct Incomes', 'Sales Accounts', 'Indirect Incomes'];
  const expGrps = ['Direct Expenses', 'Indirect Expenses', 'Purchase Accounts'];
  const depGrps = ['Depreciation'];

  let income = 0, expenses = 0, dep = 0;

  console.log('--- INCOME ---');
  for (const b of all.filter(b => incGrps.includes(b.parentGroup))) {
    const a = b.drCr === 'Cr' ? b.amount : -b.amount;
    income += a;
    console.log('  ' + b.ledgerName.padEnd(35) + ' Rs.' + b.amount);
  }
  console.log('  TOTAL: Rs.' + income.toFixed(2));

  console.log('\n--- EXPENSES (non-zero) ---');
  for (const b of all.filter(b => expGrps.includes(b.parentGroup) && b.amount > 0).sort((a, b) => b.amount - a.amount)) {
    expenses += b.drCr === 'Dr' ? b.amount : -b.amount;
    console.log('  ' + b.ledgerName.padEnd(35) + ' Rs.' + b.amount);
  }
  // Add zero ones
  for (const b of all.filter(b => expGrps.includes(b.parentGroup) && b.amount === 0)) {
    // don't add to total
  }
  console.log('  TOTAL: Rs.' + expenses.toFixed(2));

  console.log('\n--- DEPRECIATION ---');
  for (const b of all.filter(b => depGrps.includes(b.parentGroup))) {
    dep += b.drCr === 'Dr' ? b.amount : -b.amount;
    console.log('  ' + b.ledgerName.padEnd(35) + ' Rs.' + b.amount);
  }
  console.log('  TOTAL: Rs.' + dep);

  const totalExp = expenses + dep;
  const pnl = income - totalExp;
  console.log('\n=== P&L SUMMARY ===');
  console.log('Income:      Rs.' + income.toFixed(2));
  console.log('Expenses:    Rs.' + expenses.toFixed(2));
  console.log('Depreciation:Rs.' + dep);
  console.log('Total Exp:   Rs.' + totalExp.toFixed(2));
  console.log('Net ' + (pnl < 0 ? 'Loss' : 'Profit') + ':    Rs.' + Math.abs(pnl).toFixed(2));

  await client.close();
})();
