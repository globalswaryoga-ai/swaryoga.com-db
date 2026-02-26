const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const col = client.db('swaryoga_admin_crm').collection('tally_manual_balances');
  
  const exps = await col.find({ financialYear: '2024-25', category: 'expense' }).toArray();
  console.log('category=expense count:', exps.length, 'total:', exps.reduce((s,x) => s+x.amount, 0));
  
  const inc = await col.find({ financialYear: '2024-25', category: 'income' }).toArray();
  console.log('category=income count:', inc.length, 'total:', inc.reduce((s,x) => s+x.amount, 0));

  // Check if there's any with uppercase
  const allCats = await col.distinct('category', { financialYear: '2024-25' });
  console.log('All categories:', allCats);

  // Simulate what buildBSFromManual gets
  const all = await col.find({ financialYear: '2024-25' }).toArray();
  console.log('\nTotal entries passed to buildBSFromManual:', all.length);
  
  const incEntries = all.filter(e => e.category === 'income' || e.category === 'Income');
  const expEntries = all.filter(e => e.category === 'expense' || e.category === 'Indirect Expenses' || e.category === 'Direct Expenses');
  const totalIncome = incEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalExpenses = expEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
  const currentYearPL = totalIncome - totalExpenses;
  
  console.log('Income entries:', incEntries.length, 'total:', totalIncome);
  console.log('Expense entries:', expEntries.length, 'total:', totalExpenses);
  console.log('Current Year P&L:', currentYearPL, currentYearPL >= 0 ? '(Profit)' : '(Loss)');
  
  await client.close();
})();
