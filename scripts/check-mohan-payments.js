require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // All Mohan Kalburgi payments
  const payments = await db.collection('tally_manual_vouchers').find({
    financialYear: '2024-25',
    voucherType: 'Payment',
    $or: [
      { partyName: /mohan kalburgi/i },
      { partyName: /laxmi mohan kal/i }
    ]
  }).sort({ date: 1 }).toArray();

  console.log('=== MOHAN KALBURGI PAYMENTS (FY 2024-25) ===');
  let total = 0;
  payments.forEach(v => {
    total += v.amount;
    console.log(`  ${v.date} | ₹${String(v.amount).padStart(8)} | ${(v.partyName||'').substring(0,55)} | ${v.ledgerName||''} | ${v.notes||''}`);
  });
  console.log(`  TOTAL: ₹${total.toLocaleString('en-IN')}`);

  // Current asset entries
  console.log('\n=== CURRENT ASSET BALANCE ENTRIES ===');
  const assets = await db.collection('tally_manual_balances').find({
    financialYear: '2024-25', category: 'asset'
  }).toArray();
  assets.forEach(a => console.log(`  ${a.ledgerName} | ${a.parentGroup} | ₹${a.amount}`));

  // Current Director Salary entry
  console.log('\n=== DIRECTOR SALARY BALANCE ENTRY ===');
  const ds = await db.collection('tally_manual_balances').findOne({
    financialYear: '2024-25', ledgerName: 'Director Salary'
  });
  console.log(`  Amount: ₹${ds?.amount} | ID: ${ds?._id}`);

  await mongoose.disconnect();
})();
