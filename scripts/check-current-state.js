require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  console.log('=== CURRENT FY 2024-25 BALANCE ENTRIES ===');
  const all = await coll.find({ financialYear: '2024-25' }).sort({ category: 1, amount: -1 }).toArray();
  let incT=0, expT=0, astT=0;
  for (const e of all) {
    const cat = e.category;
    console.log(`  [${cat.padEnd(7)}] ${e.ledgerName.padEnd(35)} | ₹${e.amount.toLocaleString('en-IN').padStart(10)}`);
    if (cat === 'income') incT += e.amount;
    if (cat === 'expense') expT += e.amount;
    if (cat === 'asset') astT += e.amount;
  }
  console.log(`\n  Income:  ₹${incT.toLocaleString('en-IN')}`);
  console.log(`  Expense: ₹${expT.toLocaleString('en-IN')}`);
  console.log(`  Assets:  ₹${astT.toLocaleString('en-IN')}`);

  await mongoose.disconnect();
})();
