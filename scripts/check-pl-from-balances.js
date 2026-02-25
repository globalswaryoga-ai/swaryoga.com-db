const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const bal = mongoose.connection.collection('tally_manual_balances');
  
  // Balance EXPENSE entries
  const expenses = await bal.find({ financialYear: '2024-25', category: 'expense' }).sort({ amount: -1 }).toArray();
  console.log('=== Balance EXPENSE entries ===');
  let totalExp = 0;
  expenses.forEach(e => { console.log(`  ${e.ledgerName}: ${e.amount} ${e.drCr}`); totalExp += e.amount; });
  console.log(`  TOTAL EXPENSES: ${totalExp}`);

  // Balance INCOME entries
  const income = await bal.find({ financialYear: '2024-25', category: 'income' }).toArray();
  console.log('\n=== Balance INCOME entries ===');
  let totalInc = 0;
  income.forEach(e => { console.log(`  ${e.ledgerName}: ${e.amount} ${e.drCr}`); totalInc += e.amount; });
  console.log(`  TOTAL INCOME: ${totalInc}`);

  console.log(`\n=== P&L from Balance Entries ===`);
  console.log(`  Income: ${totalInc}`);
  console.log(`  Expenses: ${totalExp}`);
  console.log(`  Net: ${totalInc - totalExp} (${totalInc > totalExp ? 'PROFIT' : 'LOSS'})`);

  // Check if Resort is incorrectly in expenses
  const resort = await bal.find({ financialYear: '2024-25', ledgerName: /resort/i }).toArray();
  console.log('\n=== Resort entry ===');
  resort.forEach(e => console.log(`  ${e.ledgerName}: ${e.amount} ${e.drCr} | cat=${e.category} | group=${e.parentGroup}`));

  await mongoose.disconnect();
})();
