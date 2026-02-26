require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  const payments = await db.collection('tally_manual_vouchers').find({
    financialYear: '2024-25',
    voucherType: 'Payment',
    partyName: /upamnyu kalburgi/i
  }).sort({ date: 1 }).toArray();

  console.log('=== UPAMNYU KALBURGI PAYMENTS (FY 2024-25) ===');
  let total = 0;
  payments.forEach(v => {
    total += v.amount;
    console.log(`  ${v.date} | ₹${String(v.amount).padStart(8)} | ${(v.partyName||'').substring(0,55)} | ${v.ledgerName||''}`);
  });
  console.log(`  TOTAL: ₹${total.toLocaleString('en-IN')}`);

  // Combined totals
  const mohan = await db.collection('tally_manual_vouchers').find({
    financialYear: '2024-25', voucherType: 'Payment',
    $or: [{ partyName: /mohan kalburgi/i }, { partyName: /laxmi mohan kal/i }]
  }).toArray();
  const mohanTotal = mohan.reduce((s,v) => s + v.amount, 0);

  console.log(`\n=== SUMMARY ===`);
  console.log(`  Mohan Kalburgi total:   ₹${mohanTotal.toLocaleString('en-IN')}`);
  console.log(`  Upamnyu Kalburgi total: ₹${total.toLocaleString('en-IN')}`);
  console.log(`  Combined:               ₹${(mohanTotal + total).toLocaleString('en-IN')}`);
  console.log(`  Resort project (3.5L):  ₹3,50,000`);
  console.log(`  Remaining as salary:    ₹${((mohanTotal + total) - 350000).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
})();
