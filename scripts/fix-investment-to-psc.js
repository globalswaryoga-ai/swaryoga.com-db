const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  // 1. Delete the wrong "Unsecured Loans (Investments Received)" entry
  const del = await col.deleteOne({ 
    financialYear: '2024-25', 
    ledgerName: 'Unsecured Loans (Investments Received)' 
  });
  console.log('Deleted Unsecured Loans entry:', del.deletedCount);

  // 2. Update Preference Share Capital from 5,10,000 to 11,46,005 (5,10,000 + 6,36,005)
  const upd = await col.updateOne(
    { financialYear: '2024-25', ledgerName: 'Preference Share Capital' },
    { $set: { 
      amount: 1146005,
      notes: 'Opening ₹5,10,000 + New Investment ₹6,36,005 = ₹11,46,005',
      updatedAt: new Date()
    }}
  );
  console.log('Updated Preference Share Capital:', upd.modifiedCount);

  // Verify
  console.log('\n=== UPDATED CAPITAL/LIABILITY ENTRIES ===');
  const entries = await col.find({ 
    financialYear: '2024-25', 
    category: 'liability' 
  }).toArray();
  
  let totalLiab = 0;
  for (const e of entries) {
    const sign = e.drCr === 'Dr' ? -1 : 1;
    totalLiab += sign * e.amount;
    console.log(`  ${e.ledgerName} | ₹${e.amount.toLocaleString('en-IN')} ${e.drCr} | group=${e.parentGroup}`);
  }
  console.log(`  NET LIABILITIES (Cr - Dr): ₹${totalLiab.toLocaleString('en-IN')}`);

  // Full BS check
  const all = await col.find({ financialYear: '2024-25' }).toArray();
  let dr = 0, cr = 0;
  for (const e of all) {
    if (e.drCr === 'Dr') dr += e.amount;
    else cr += e.amount;
  }
  console.log(`\nTotal Dr: ₹${dr.toLocaleString('en-IN')}`);
  console.log(`Total Cr: ₹${cr.toLocaleString('en-IN')}`);
  console.log(`Gap (Dr - Cr): ₹${(dr - cr).toLocaleString('en-IN')}`);
  console.log(`Total entries: ${all.length}`);

  await mongoose.disconnect();
}
fix();
