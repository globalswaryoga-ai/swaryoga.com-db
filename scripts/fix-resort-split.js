require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  // Current state
  const ds = await coll.findOne({ financialYear: '2024-25', ledgerName: 'Director Salary' });
  const rp = await coll.findOne({ financialYear: '2024-25', ledgerName: 'Resort Project' });
  const totalDir = ds.amount + rp.amount; // 5,967 + 3,50,000 = 3,55,967
  console.log('Current Director Salary:', ds.amount);
  console.log('Current Resort Project:', rp.amount);
  console.log('Combined total:', totalDir);

  // New split
  const mohanSalary = 75000;
  const upamanyuRemuneration = 36000;
  const resortAmount = totalDir - mohanSalary - upamanyuRemuneration;

  console.log('\n--- NEW SPLIT ---');
  console.log('Director Salary (Mohan):', mohanSalary);
  console.log('Upamanyu Remuneration:', upamanyuRemuneration);
  console.log('Resort Project:', resortAmount);
  console.log('Check total:', mohanSalary + upamanyuRemuneration + resortAmount, '=', totalDir);

  // 1. Update Director Salary → ₹75,000
  await coll.updateOne({ _id: ds._id }, { $set: {
    amount: mohanSalary,
    notes: 'Director salary - Mohan Kalburgi (₹75,000/year)',
    updatedAt: new Date()
  }});
  console.log('\n✅ Updated Director Salary → ₹75,000');

  // 2. Update Resort Project → ₹2,44,967
  await coll.updateOne({ _id: rp._id }, { $set: {
    amount: resortAmount,
    notes: 'Resort project investment from director funds (Mohan Kalburgi & Upamanyu Kalburgi)',
    updatedAt: new Date()
  }});
  console.log('✅ Updated Resort Project → ₹' + resortAmount.toLocaleString('en-IN'));

  // 3. Insert Upamanyu Remuneration
  await coll.insertOne({
    ledgerName: 'Upamanyu Remuneration',
    parentGroup: 'Admin Expenses',
    category: 'expense',
    amount: upamanyuRemuneration,
    drCr: 'Dr',
    financialYear: '2024-25',
    asOnDate: '31-03-2025',
    notes: 'Upamanyu Kalburgi remuneration (₹3,000/month × 12)',
    createdBy: 'system-script',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('✅ Inserted Upamanyu Remuneration → ₹36,000');

  // Verify
  console.log('\n=== VERIFICATION ===');
  const all = await coll.find({ financialYear: '2024-25' }).sort({ category: 1, amount: -1 }).toArray();
  let incomeT = 0, expenseT = 0, assetT = 0;
  for (const e of all) {
    console.log(`  [${e.category.padEnd(7)}] ${e.ledgerName.padEnd(35)} | ${e.drCr} | ₹${e.amount.toLocaleString('en-IN').padStart(10)}`);
    if (e.category === 'income') incomeT += e.amount;
    if (e.category === 'expense') expenseT += e.amount;
    if (e.category === 'asset') assetT += e.amount;
  }
  console.log(`\n  Income:     ₹${incomeT.toLocaleString('en-IN')}`);
  console.log(`  Expenses:   ₹${expenseT.toLocaleString('en-IN')}`);
  console.log(`  Assets:     ₹${assetT.toLocaleString('en-IN')}`);
  console.log(`  Net Profit: ₹${(incomeT - expenseT).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
})();
