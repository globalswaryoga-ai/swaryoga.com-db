const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const col = client.db('swaryoga_admin_crm').collection('tally_manual_balances');

  console.log('=== FIXING BS ISSUES ===\n');

  // 1. DELETE duplicate Amount Payable (keep ONE, delete ONE)
  const aps = await col.find({ ledgerName: 'Amount Payable', financialYear: '2024-25' }).toArray();
  console.log(`Amount Payable entries found: ${aps.length}`);
  if (aps.length > 1) {
    // Delete the second one
    const delResult = await col.deleteOne({ _id: aps[1]._id });
    console.log(`  Deleted duplicate Amount Payable: ${delResult.deletedCount}`);
  }

  // 2. FIX Course Fees: 750772.81 → 650772.81 (reduce by 1L)
  const course = await col.findOne({ ledgerName: 'Course Fees', financialYear: '2024-25' });
  if (course) {
    const newAmount = course.amount - 100000;
    const upd = await col.updateOne({ _id: course._id }, { $set: { amount: newAmount } });
    console.log(`  Course Fees: ${course.amount} → ${newAmount} (mod: ${upd.modifiedCount})`);
  }

  // 3. FIX Cash Account: 413886 → 313886 (reduce by 1L)
  const cash = await col.findOne({ ledgerName: 'Cash Account', financialYear: '2024-25' });
  if (cash) {
    const newAmount = cash.amount - 100000;
    const upd = await col.updateOne({ _id: cash._id }, { $set: { amount: newAmount } });
    console.log(`  Cash Account: ${cash.amount} → ${newAmount} (mod: ${upd.modifiedCount})`);
  }

  // 4. DELETE duplicate Laxmi Kalburgi (₹0 entry)
  const lks = await col.find({ ledgerName: 'Laxmi Kalburgi', financialYear: '2024-25' }).toArray();
  console.log(`\nLaxmi Kalburgi entries: ${lks.length}`);
  const lkZero = lks.find(e => e.amount === 0);
  if (lkZero && lks.length > 1) {
    const delResult = await col.deleteOne({ _id: lkZero._id });
    console.log(`  Deleted ₹0 Laxmi Kalburgi: ${delResult.deletedCount}`);
  }

  // 5. VERIFY after fixes
  console.log('\n=== VERIFICATION ===\n');
  const all = await col.find({ financialYear: '2024-25' }).toArray();
  
  const assets = all.filter(e => e.category === 'asset');
  const liabilities = all.filter(e => e.category === 'liability');
  const incomeEntries = all.filter(e => e.category === 'income');
  const expenseEntries = all.filter(e => e.category === 'expense');

  // Assets total (all Dr)
  let totalAssets = 0;
  console.log('ASSETS:');
  assets.forEach(e => {
    totalAssets += e.amount;
    console.log(`  ${e.ledgerName.padEnd(35)} ₹${e.amount.toLocaleString('en-IN')}`);
  });
  console.log(`  ${'TOTAL'.padEnd(35)} ₹${totalAssets.toLocaleString('en-IN')}`);

  // Liabilities (Cr adds, Dr subtracts)
  let totalLiabCr = 0;
  let totalLiabDr = 0;
  console.log('\nLIABILITIES:');
  liabilities.forEach(e => {
    if (e.drCr === 'Cr') {
      totalLiabCr += e.amount;
      console.log(`  ${e.ledgerName.padEnd(35)} ₹${e.amount.toLocaleString('en-IN')} Cr`);
    } else {
      totalLiabDr += e.amount;
      console.log(`  ${e.ledgerName.padEnd(35)} ₹${e.amount.toLocaleString('en-IN')} Dr (reduces liab)`);
    }
  });
  const netLiab = totalLiabCr - totalLiabDr;
  console.log(`  ${'Cr Total'.padEnd(35)} ₹${totalLiabCr.toLocaleString('en-IN')}`);
  console.log(`  ${'Dr Total (reduces)'.padEnd(35)} ₹${totalLiabDr.toLocaleString('en-IN')}`);
  console.log(`  ${'NET LIABILITIES'.padEnd(35)} ₹${netLiab.toLocaleString('en-IN')}`);

  // Income & Expenses
  let totalIncome = 0, totalExpense = 0;
  incomeEntries.forEach(e => totalIncome += e.amount);
  expenseEntries.forEach(e => totalExpense += e.amount);
  const netPL = totalIncome - totalExpense;

  console.log('\nP&L:');
  console.log(`  Total Income:   ₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`  Total Expenses: ₹${totalExpense.toLocaleString('en-IN')}`);
  console.log(`  Net P&L:        ₹${netPL.toLocaleString('en-IN')} (${netPL < 0 ? 'LOSS' : 'PROFIT'})`);

  // BS Balance check
  console.log('\n=== BS BALANCE ===');
  console.log(`  Assets:                ₹${totalAssets.toLocaleString('en-IN')}`);
  console.log(`  Net Liabilities:       ₹${netLiab.toLocaleString('en-IN')}`);
  const bsDiff = totalAssets - netLiab;
  console.log(`  Difference (A - L):    ₹${bsDiff.toLocaleString('en-IN')} ${bsDiff === 0 ? '✅ BALANCED' : '❌ NOT BALANCED'}`);

  // With auto P&L
  const liabWithPL = netLiab + netPL;
  console.log(`\n  With Auto P&L injected:`);
  console.log(`  Liab + Current Year:   ₹${liabWithPL.toLocaleString('en-IN')}`);
  const bsDiffPL = totalAssets - liabWithPL;
  console.log(`  Difference:            ₹${bsDiffPL.toLocaleString('en-IN')}`);

  // Unsecured Loans breakdown
  console.log('\n=== UNSECURED LOANS ===');
  const unsec = all.filter(e => e.parentGroup === 'Unsecured Loans');
  let unsecTotal = 0;
  unsec.forEach(e => {
    console.log(`  ${e.ledgerName}: ₹${e.amount.toLocaleString('en-IN')}`);
    unsecTotal += e.amount;
  });
  console.log(`  TOTAL: ₹${unsecTotal.toLocaleString('en-IN')}`);

  console.log(`\nTotal entries: ${all.length}`);

  await client.close();
})();
