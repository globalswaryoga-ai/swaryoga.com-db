const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const col = client.db('swaryoga_admin_crm').collection('tally_manual_balances');

  // 1. Re-add Amount Payable at 2L
  await col.insertOne({
    ledgerName: 'Amount Payable',
    parentGroup: 'Unsecured Loans',
    category: 'liability',
    amount: 200000,
    drCr: 'Cr',
    financialYear: '2024-25',
    asOnDate: '2025-03-31',
    notes: 'Carry forward from FY 2023-24. Amount payable.',
    createdBy: 'script',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('Added Amount Payable Rs.2,00,000');

  // 2. Add 1L more to Course Fees
  const course = await col.findOne({ ledgerName: 'Course Fees', financialYear: '2024-25' });
  const newCourse = course.amount + 100000;
  await col.updateOne({ _id: course._id }, { $set: { amount: newCourse, updatedAt: new Date() } });
  console.log('Course Fees:', course.amount, '->', newCourse);

  // 3. Add 1L more to Cash Account
  const cash = await col.findOne({ ledgerName: 'Cash Account', financialYear: '2024-25' });
  const newCash = cash.amount + 100000;
  await col.updateOne({ _id: cash._id }, { $set: { amount: newCash, updatedAt: new Date() } });
  console.log('Cash Account:', cash.amount, '->', newCash);

  await client.close();
})();
