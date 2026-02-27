const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // Get all ledgers
  const allLedgers = await db.collection('acc_ledgers').find({}).toArray();
  const ledgerMap = {};
  const provisionIds = [];
  for (const l of allLedgers) {
    ledgerMap[l._id.toString()] = { name: l.name, group: l.group, subGroup: l.subGroup };
    if (/Short-Term Provisions/i.test(l.name)) provisionIds.push(l._id.toString());
  }

  // Find ALL vouchers without receiptFileUrl
  const vouchers = await db.collection('acc_vouchers').find({
    isReversed: { $ne: true },
    $or: [{ receiptFileUrl: { $exists: false } }, { receiptFileUrl: null }, { receiptFileUrl: '' }]
  }).sort({ date: 1 }).toArray();

  // Filter: pending bills where the primary (non-cash/bank) entry ledger is Short-Term Provisions
  const cashBankSubGroups = ['Cash-in-Hand', 'Bank Accounts', 'Cash', 'Bank'];
  
  let bills = [];
  for (const v of vouchers) {
    const primaryEntry = v.entries?.find(e => {
      const info = ledgerMap[e.ledgerId?.toString()];
      return info && !cashBankSubGroups.includes(info.subGroup || '');
    }) || v.entries?.[0];

    const ledgerInfo = primaryEntry ? ledgerMap[primaryEntry.ledgerId?.toString()] : null;
    const ledgerName = ledgerInfo?.name || 'Unknown';

    if (provisionIds.includes(primaryEntry?.ledgerId?.toString())) {
      // Get all entry details
      const entryDetails = v.entries?.map(e => {
        const info = ledgerMap[e.ledgerId?.toString()];
        return `${e.type}: ${info?.name || '?'} (${info?.group || '?'}) Rs.${e.amount?.toLocaleString('en-IN')}`;
      }).join(' | ');

      bills.push({
        voucherNumber: v.voucherNumber,
        date: v.date ? new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '?',
        type: v.type,
        amount: v.totalDebit || 0,
        narration: v.narration || '-',
        entries: entryDetails
      });
    }
  }

  console.log(`=== Short-Term Provisions — Pending Bills (${bills.length}) ===\n`);
  
  // Group by type for summary
  const byType = {};
  const byContra = {};
  let grandTotal = 0;

  for (let i = 0; i < bills.length; i++) {
    const b = bills[i];
    grandTotal += b.amount;
    byType[b.type] = (byType[b.type] || 0) + 1;
    
    console.log(`${i+1}. ${b.voucherNumber} | ${b.date} | ${b.type} | Rs.${b.amount.toLocaleString('en-IN')} | ${b.narration}`);
    console.log(`   Entries: ${b.entries}`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Bills: ${bills.length}`);
  console.log(`Total Amount: Rs.${grandTotal.toLocaleString('en-IN')}`);
  console.log(`By Type:`, byType);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
