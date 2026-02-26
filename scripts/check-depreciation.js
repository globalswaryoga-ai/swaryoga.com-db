require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const coll = db.collection('tally_manual_balances');

  // FY 2023-24 data
  console.log('=== FY 2023-24 ===');
  const fy23 = await coll.find({ financialYear: '2023-24' }).sort({ category: 1, amount: -1 }).toArray();
  let inc23 = 0, exp23 = 0, asset23 = 0;
  for (const e of fy23) {
    console.log(`  [${e.category.padEnd(7)}] ${e.ledgerName.padEnd(35)} | ${e.drCr} | ₹${e.amount.toLocaleString('en-IN').padStart(10)}`);
    if (e.category === 'income') inc23 += e.amount;
    if (e.category === 'expense') exp23 += e.amount;
    if (e.category === 'asset') asset23 += e.amount;
  }
  console.log(`  Income: ₹${inc23.toLocaleString('en-IN')} | Expense: ₹${exp23.toLocaleString('en-IN')} | Assets: ₹${asset23.toLocaleString('en-IN')}`);
  console.log(`  Net: ₹${(inc23 - exp23).toLocaleString('en-IN')} (${inc23 - exp23 >= 0 ? 'PROFIT' : 'LOSS'})`);
  console.log(`  Entries: ${fy23.length}`);

  // FY 2024-25 data
  console.log('\n=== FY 2024-25 ===');
  const fy24 = await coll.find({ financialYear: '2024-25' }).sort({ category: 1, amount: -1 }).toArray();
  let inc25 = 0, exp25 = 0, asset25 = 0;
  const assets25 = [];
  for (const e of fy24) {
    if (e.category === 'income') inc25 += e.amount;
    if (e.category === 'expense') exp25 += e.amount;
    if (e.category === 'asset') { asset25 += e.amount; assets25.push(e); }
  }
  console.log(`  Income: ₹${inc25.toLocaleString('en-IN')} | Expense: ₹${exp25.toLocaleString('en-IN')} | Assets: ₹${asset25.toLocaleString('en-IN')}`);
  console.log(`  Net (before dep): ₹${(inc25 - exp25).toLocaleString('en-IN')}`);

  // FY 2023-24 voucher audit (from earlier script findings)
  const v23 = await db.collection('tally_manual_vouchers').find({ financialYear: '2023-24' }).toArray();
  const receipts23 = v23.filter(v => v.voucherType === 'Receipt');
  const payments23 = v23.filter(v => v.voucherType === 'Payment');
  const recTotal = receipts23.reduce((s,v) => s + v.amount, 0);
  const payTotal = payments23.reduce((s,v) => s + v.amount, 0);
  console.log(`\n=== FY 2023-24 VOUCHER TOTALS ===`);
  console.log(`  Receipts: ${receipts23.length} vouchers, ₹${recTotal.toLocaleString('en-IN')}`);
  console.log(`  Payments: ${payments23.length} vouchers, ₹${payTotal.toLocaleString('en-IN')}`);
  console.log(`  Net (R - P): ₹${(recTotal - payTotal).toLocaleString('en-IN')} (${recTotal - payTotal >= 0 ? 'surplus' : 'deficit'})`);

  // Depreciation calculation for FY 2024-25
  console.log('\n=== DEPRECIATION CALCULATION (FY 2024-25) ===');
  console.log('  Standard rates (Companies Act SLM):');
  console.log('  - Building/Resort: 5%');
  console.log('  - Office Equipment/Computers: 40% (IT Act) or 15% (SLM)');
  console.log('  - Investments: No depreciation\n');

  const depItems = [
    { name: 'Resort Project', amount: 244967, rate: 0.05 },
    { name: 'Office Equipment', amount: 32050, rate: 0.40 },
  ];
  let totalDep = 0;
  for (const d of depItems) {
    const dep = Math.round(d.amount * d.rate);
    totalDep += dep;
    console.log(`  ${d.name.padEnd(25)} ₹${d.amount.toLocaleString('en-IN').padStart(10)} × ${(d.rate*100)}% = ₹${dep.toLocaleString('en-IN')}`);
  }
  console.log(`  ${'TOTAL DEPRECIATION'.padEnd(25)}                        = ₹${totalDep.toLocaleString('en-IN')}`);

  console.log(`\n=== AFTER DEPRECIATION ===`);
  console.log(`  Net Profit (before dep): ₹${(inc25 - exp25).toLocaleString('en-IN')}`);
  console.log(`  Depreciation:           -₹${totalDep.toLocaleString('en-IN')}`);
  console.log(`  Net Profit (after dep):  ₹${(inc25 - exp25 - totalDep).toLocaleString('en-IN')} (${(inc25 - exp25 - totalDep) >= 0 ? 'PROFIT' : 'LOSS'})`);

  await mongoose.disconnect();
})();
