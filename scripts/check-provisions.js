const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  
  // Search for provision-related ledgers
  const ledgers = await db.collection('accledgers').find({ 
    name: { $regex: /provision/i }
  }).toArray();
  
  console.log('=== Provision Ledgers ===');
  for (const l of ledgers) {
    console.log(`Name: ${l.name} | Group: ${l.group} | SubGroup: ${l.subGroup} | Opening: ${l.openingBalance}`);
  }
  
  // Search for vouchers involving provision ledgers
  const ledgerIds = ledgers.map(l => l._id);
  if (ledgerIds.length > 0) {
    // Also get all ledgers for name lookup
    const allLedgers = await db.collection('accledgers').find({}).toArray();
    const ledgerMap = {};
    for (const al of allLedgers) ledgerMap[al._id.toString()] = al.name;

    const vouchers = await db.collection('accvouchers').find({
      'entries.ledgerId': { $in: ledgerIds },
      isReversed: { $ne: true }
    }).sort({ date: -1 }).limit(20).toArray();
    
    console.log(`\n=== Vouchers with Provision entries (${vouchers.length}) ===`);
    for (const v of vouchers) {
      console.log(`\nVoucher: ${v.voucherNumber} | Type: ${v.type} | Date: ${v.date?.toISOString?.()?.slice(0,10)}`);
      console.log(`Narration: ${v.narration || '-'}`);
      for (const e of v.entries) {
        const name = ledgerMap[e.ledgerId?.toString()] || e.ledgerId;
        console.log(`  ${e.type}: ${name} = Rs.${e.amount}`);
      }
    }
  } else {
    console.log('\nNo provision ledgers found.');
  }
  
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
