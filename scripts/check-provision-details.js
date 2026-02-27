const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // Find "Short-Term Provisions" ledger
  const ledgers = await db.collection('acc_ledgers').find({ name: /Short-Term Provisions/i }).toArray();
  console.log('=== Short-Term Provisions Ledger(s) ===');
  for (const l of ledgers) {
    console.log(`ID: ${l._id} | Name: ${l.name} | Group: ${l.group} | SubGroup: ${l.subGroup} | Opening: ${l.openingBalance} ${l.openingBalanceType} | FY: ${l.financialYear}`);
  }

  const ledgerIds = ledgers.map(l => l._id);
  
  // Get all ledgers for name lookup
  const allLedgers = await db.collection('acc_ledgers').find({}).toArray();
  const ledgerMap = {};
  for (const al of allLedgers) ledgerMap[al._id.toString()] = { name: al.name, group: al.group, subGroup: al.subGroup };

  // Find all vouchers involving Short-Term Provisions
  const vouchers = await db.collection('acc_vouchers').find({
    'entries.ledgerId': { $in: ledgerIds },
    isReversed: { $ne: true }
  }).sort({ date: 1 }).toArray();

  console.log(`\n=== Vouchers involving Short-Term Provisions (${vouchers.length}) ===`);
  
  let totalDebit = 0;
  let totalCredit = 0;
  let count = 0;

  for (const v of vouchers) {
    count++;
    // Find the Short-Term Provisions entry in this voucher
    const provEntry = v.entries.find(e => ledgerIds.some(id => id.toString() === e.ledgerId?.toString()));
    // Find the contra entry
    const contraEntries = v.entries.filter(e => !ledgerIds.some(id => id.toString() === e.ledgerId?.toString()));
    
    const provAmount = provEntry ? provEntry.amount : 0;
    const provType = provEntry ? provEntry.type : '?';
    
    if (provType === 'DEBIT') totalDebit += provAmount;
    else totalCredit += provAmount;

    const contraNames = contraEntries.map(e => {
      const info = ledgerMap[e.ledgerId?.toString()];
      return info ? `${info.name} (${info.group})` : e.ledgerId;
    }).join(', ');

    const dateStr = v.date ? new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '?';
    
    console.log(`${count}. ${v.voucherNumber || '-'} | ${dateStr} | ${v.type} | Prov: ${provType} Rs.${provAmount.toLocaleString('en-IN')} | Contra: ${contraNames} | Narration: ${v.narration || '-'}`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total vouchers: ${count}`);
  console.log(`Total DEBIT (paid/reduced): Rs.${totalDebit.toLocaleString('en-IN')}`);
  console.log(`Total CREDIT (provisioned/added): Rs.${totalCredit.toLocaleString('en-IN')}`);
  console.log(`Opening Balance: Rs.7,500 (Credit)`);
  console.log(`Net Provision Balance: Rs.${(7500 + totalCredit - totalDebit).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
