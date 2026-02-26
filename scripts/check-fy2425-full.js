const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  console.log('=== FY 2024-25 ALL ENTRIES ===');
  const entries = await col.find({ financialYear: '2024-25' }).sort({ category: 1, ledgerName: 1 }).toArray();
  
  let totalDr = 0, totalCr = 0;
  const byCategory = {};
  
  for (const e of entries) {
    const cat = e.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(e);
    if (e.drCr === 'Dr') totalDr += e.amount;
    else totalCr += e.amount;
  }

  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`\n--- ${cat.toUpperCase()} ---`);
    let catTotal = 0;
    for (const e of items) {
      console.log(`  ${e.ledgerName} | ₹${e.amount.toLocaleString('en-IN')} ${e.drCr} | group=${e.parentGroup}`);
      catTotal += e.amount;
    }
    console.log(`  SUBTOTAL: ₹${catTotal.toLocaleString('en-IN')}`);
  }

  console.log(`\nTotal entries: ${entries.length}`);
  console.log(`Total Dr: ₹${totalDr.toLocaleString('en-IN')}`);
  console.log(`Total Cr: ₹${totalCr.toLocaleString('en-IN')}`);
  console.log(`Difference (Dr - Cr): ₹${(totalDr - totalCr).toLocaleString('en-IN')}`);

  // Also show FY 2023-24 capital for reference
  console.log('\n=== FY 2023-24 CAPITAL/LIABILITY ENTRIES ===');
  const prev = await col.find({ financialYear: '2023-24', category: 'liability' }).toArray();
  for (const e of prev) {
    console.log(`  ${e.ledgerName} | ₹${e.amount.toLocaleString('en-IN')} ${e.drCr} | group=${e.parentGroup}`);
  }

  await mongoose.disconnect();
}
check();
