const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');

  // 1. Add ₹90,000 cash income to Course Fees
  const courseFees = await col.findOne({ financialYear: '2024-25', ledgerName: 'Course Fees' });
  const newCourseFees = courseFees.amount + 90000;
  await col.updateOne(
    { _id: courseFees._id },
    { $set: { amount: newCourseFees, notes: (courseFees.notes || '') + ' | +₹90,000 cash income (Oct-15, 40 students)', updatedAt: new Date() } }
  );
  console.log('1. Course Fees: Rs.' + courseFees.amount + ' → Rs.' + newCourseFees + ' (+₹90,000 cash income)');

  // 2. Move MacBook EMI ₹10,500 from Indirect Expenses to Unsecured Loans (BS)
  await col.updateOne(
    { financialYear: '2024-25', ledgerName: 'MacBook EMI' },
    { $set: { parentGroup: 'Unsecured Loans', category: 'liability', drCr: 'Cr', notes: 'EMI loan repayment - moved from expenses to BS', updatedAt: new Date() } }
  );
  console.log('2. MacBook EMI Rs.10,500: Indirect Expenses → Unsecured Loans (BS)');

  // 3. Move Laptop EMI ₹12,990 from Indirect Expenses to Unsecured Loans (BS)
  await col.updateOne(
    { financialYear: '2024-25', ledgerName: 'Laptop EMI (L&T Finance)' },
    { $set: { parentGroup: 'Unsecured Loans', category: 'liability', drCr: 'Cr', notes: 'EMI loan repayment - moved from expenses to BS', updatedAt: new Date() } }
  );
  console.log('3. Laptop EMI Rs.12,990: Indirect Expenses → Unsecured Loans (BS)');

  // 4. Verify
  const all = await col.find({ financialYear: '2024-25' }).toArray();
  const incomeGrps = ['Direct Incomes', 'Sales Accounts', 'Indirect Incomes'];
  const expenseGrps = ['Direct Expenses', 'Indirect Expenses', 'Purchase Accounts'];
  const depGrps = ['Depreciation'];

  let income = 0, expenses = 0, dep = 0;
  for (const b of all) {
    const g = b.parentGroup || '';
    if (incomeGrps.includes(g)) income += (b.drCr === 'Cr' ? b.amount : -b.amount);
    else if (expenseGrps.includes(g)) expenses += (b.drCr === 'Dr' ? b.amount : -b.amount);
    else if (depGrps.includes(g)) dep += (b.drCr === 'Dr' ? b.amount : -b.amount);
  }

  const totalExp = expenses + dep;
  const pnl = income - totalExp;
  console.log('\n=== UPDATED P&L ===');
  console.log('Income:       Rs.' + income.toFixed(2));
  console.log('Expenses:     Rs.' + expenses.toFixed(2));
  console.log('Depreciation: Rs.' + dep.toFixed(2));
  console.log('Total Exp:    Rs.' + totalExp.toFixed(2));
  console.log('NET ' + (pnl < 0 ? 'LOSS' : 'PROFIT') + ':    Rs.' + Math.abs(pnl).toFixed(2));

  await client.close();
})();
