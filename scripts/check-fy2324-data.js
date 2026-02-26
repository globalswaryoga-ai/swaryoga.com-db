require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // FY 2023-24 vouchers
  const vouchers = await db.collection('tally_manual_vouchers').find({
    financialYear: '2023-24'
  }).sort({ date: 1 }).toArray();

  console.log('=== FY 2023-24 VOUCHERS ===');
  console.log('Total:', vouchers.length);

  const byType = {};
  for (const v of vouchers) {
    const t = v.voucherType;
    if (!byType[t]) byType[t] = { count: 0, total: 0, items: [] };
    byType[t].count++;
    byType[t].total += v.amount;
    byType[t].items.push(v);
  }

  for (const [type, data] of Object.entries(byType)) {
    console.log(`\n  ${type}: ${data.count} vouchers, ₹${data.total.toLocaleString('en-IN')}`);
  }

  // Receipts breakdown
  if (byType['Receipt']) {
    console.log('\n=== RECEIPT VOUCHERS ===');
    for (const v of byType['Receipt'].items) {
      console.log(`  ${v.date} | ₹${String(v.amount).padStart(10)} | ${(v.partyName||'').substring(0,50)} | ${v.ledgerName||''}`);
    }
  }

  // Payment breakdown by ledger/party
  if (byType['Payment']) {
    console.log('\n=== PAYMENT VOUCHERS BY CATEGORY ===');
    const cats = {};
    for (const v of byType['Payment'].items) {
      const key = v.ledgerName || v.partyName || 'Unknown';
      if (!cats[key]) cats[key] = { total: 0, count: 0 };
      cats[key].total += v.amount;
      cats[key].count++;
    }
    const sorted = Object.entries(cats).sort((a,b) => b[1].total - a[1].total);
    for (const [name, d] of sorted) {
      console.log(`  ${name.substring(0,45).padEnd(45)} | ${d.count} | ₹${d.total.toLocaleString('en-IN').padStart(10)}`);
    }
  }

  // FY 2023-24 balance entries
  console.log('\n=== FY 2023-24 BALANCE ENTRIES ===');
  const bals = await db.collection('tally_manual_balances').find({ financialYear: '2023-24' }).toArray();
  console.log('Count:', bals.length);
  for (const b of bals) {
    console.log(`  [${b.category}] ${b.ledgerName} | ${b.drCr} | ₹${b.amount}`);
  }

  await mongoose.disconnect();
})();
