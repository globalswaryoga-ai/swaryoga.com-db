const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');

  // 1. Update Course Fees (add 1L)
  const course = await col.findOne({ ledgerName: 'Course Fees', financialYear: '2024-25' });
  console.log('Course Fees BEFORE:', course.amount);
  const newCourse = course.amount + 100000;
  await col.updateOne({ _id: course._id }, { $set: { amount: newCourse, updatedAt: new Date() } });
  console.log('Course Fees AFTER:', newCourse);

  // 2. Update Cash Account (add 1L)
  const cash = await col.findOne({ ledgerName: 'Cash Account', financialYear: '2024-25' });
  console.log('Cash Account BEFORE:', cash.amount);
  const newCash = cash.amount + 100000;
  await col.updateOne({ _id: cash._id }, { $set: { amount: newCash, updatedAt: new Date() } });
  console.log('Cash Account AFTER:', newCash);

  // 3. Show new P&L
  const income = await col.find({ financialYear: '2024-25', category: 'Income' }).toArray();
  const expenses = await col.find({ financialYear: '2024-25', category: { $in: ['Indirect Expenses', 'Direct Expenses'] } }).toArray();
  const dep = await col.find({ financialYear: '2024-25', parentGroup: 'Depreciation' }).toArray();

  const totalIncome = income.reduce((s, x) => s + x.amount, 0);
  const totalExp = expenses.reduce((s, x) => s + x.amount, 0);
  const totalDep = dep.reduce((s, x) => s + x.amount, 0);

  console.log('\n--- Updated P&L ---');
  console.log('Income:', totalIncome.toFixed(2));
  console.log('Expenses:', totalExp.toFixed(2));
  console.log('Depreciation:', totalDep.toFixed(2));
  console.log('Net Loss:', (totalExp + totalDep - totalIncome).toFixed(2));

  await client.close();
}
main().catch(console.error);
