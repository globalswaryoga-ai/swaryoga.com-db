require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  // 1. Reduce Director Salary from ₹3,55,967 to ₹5,967
  const ds = await coll.findOne({ financialYear: '2024-25', ledgerName: 'Director Salary' });
  console.log('BEFORE Director Salary:', ds.amount);

  const newDirSalary = Math.round(ds.amount - 350000);
  await coll.updateOne(
    { _id: ds._id },
    { $set: { amount: newDirSalary, updatedAt: new Date(), notes: 'Adjusted: ₹3,50,000 moved to Resort Project asset' } }
  );
  console.log('AFTER Director Salary:', newDirSalary);

  // 2. Insert Resort Project as an asset
  await coll.insertOne({
    ledgerName: 'Resort Project',
    parentGroup: 'Fixed Assets',
    category: 'asset',
    amount: 350000,
    drCr: 'Dr',
    financialYear: '2024-25',
    asOnDate: '31-03-2025',
    notes: 'Resort project investment from director funds (Mohan Kalburgi & Upamnyu Kalburgi)',
    createdBy: 'system-script',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('INSERTED Resort Project asset: ₹3,50,000');

  // 3. Verify
  console.log('\n=== VERIFICATION ===');
  const all = await coll.find({ financialYear: '2024-25' }).sort({ category: 1, amount: -1 }).toArray();
  let incomeT = 0, expenseT = 0, assetT = 0;
  for (const e of all) {
    const label = `[${e.category.padEnd(7)}] ${e.ledgerName.padEnd(35)} | ${e.drCr} | ₹${e.amount.toLocaleString('en-IN').padStart(10)}`;
    console.log(`  ${label}`);
    if (e.category === 'income') incomeT += e.amount;
    if (e.category === 'expense') expenseT += e.amount;
    if (e.category === 'asset') assetT += e.amount;
  }
  console.log(`\n  Total Income:  ₹${incomeT.toLocaleString('en-IN')}`);
  console.log(`  Total Expense: ₹${expenseT.toLocaleString('en-IN')}`);
  console.log(`  Total Assets:  ₹${assetT.toLocaleString('en-IN')}`);
  console.log(`  Net Profit:    ₹${(incomeT - expenseT).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
})();
