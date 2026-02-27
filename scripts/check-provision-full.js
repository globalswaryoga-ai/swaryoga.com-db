const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  const allLedgers = await db.collection('acc_ledgers').find({}).toArray();
  const ledgerMap = {};
  for (const l of allLedgers) ledgerMap[l._id.toString()] = { name: l.name, group: l.group, subGroup: l.subGroup };

  // Get tally_manual_vouchers 
  const vouchers = await db.collection('tally_manual_vouchers').find({}).toArray();
  console.log('Total tally_manual_vouchers:', vouchers.length);

  // Check structure of first 3
  console.log('\n=== Sample Vouchers ===');
  for (let i = 0; i < Math.min(3, vouchers.length); i++) {
    const v = vouchers[i];
    console.log('\n--- Voucher ' + (i+1) + ' ---');
    console.log('Keys:', Object.keys(v).join(', '));
    console.log('Number:', v.voucherNumber || v.number);
    console.log('Type:', v.type || v.voucherType);
    console.log('Date:', v.date);
    console.log('Amount:', v.totalDebit || v.amount || v.total);
    console.log('Narration:', v.narration);
    console.log('FY:', v.financialYear);
    console.log('receiptFileUrl:', v.receiptFileUrl);
    if (v.entries) {
      for (const e of v.entries) {
        const info = ledgerMap[e.ledgerId?.toString()];
        console.log('  Entry:', e.type, info?.name || e.ledgerId, 'Rs.' + e.amount, '(' + (info?.group || '?') + ')');
      }
    }
  }

  // Now find provisions-related ones
  const provisionIds = allLedgers.filter(l => /Short-Term Provisions/i.test(l.name)).map(l => l._id.toString());
  console.log('\nProvision ledger IDs:', provisionIds);

  const cashBankSubs = ['Cash-in-Hand', 'Bank Accounts', 'Cash', 'Bank'];
  let provBills = [];
  let totalAmt = 0;

  for (const v of vouchers) {
    if (v.isReversed) continue;
    if (v.receiptFileUrl) continue; // has receipt, not pending
    
    // Find primary entry (non-cash/bank)
    const primaryEntry = v.entries?.find(e => {
      const info = ledgerMap[e.ledgerId?.toString()];
      return info && !cashBankSubs.includes(info.subGroup || '');
    }) || v.entries?.[0];

    if (primaryEntry && provisionIds.includes(primaryEntry.ledgerId?.toString())) {
      const amt = v.totalDebit || 0;
      totalAmt += amt;
      
      // Get contra entries
      const contraNames = v.entries?.filter(e => e.ledgerId?.toString() !== primaryEntry.ledgerId?.toString())
        .map(e => ledgerMap[e.ledgerId?.toString()]?.name || '?').join(', ');

      provBills.push({
        num: v.voucherNumber,
        date: v.date ? new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '?',
        type: v.type,
        amount: amt,
        narration: v.narration || '-',
        contra: contraNames
      });
    }
  }

  console.log('\n=== Short-Term Provisions Pending Bills (' + provBills.length + ') ===');
  console.log('Total: Rs.' + totalAmt.toLocaleString('en-IN'));
  
  // Group by narration pattern / contra ledger
  const byContra = {};
  for (const b of provBills) {
    const key = b.contra || 'Unknown';
    if (!byContra[key]) byContra[key] = { count: 0, total: 0, samples: [] };
    byContra[key].count++;
    byContra[key].total += b.amount;
    if (byContra[key].samples.length < 3) byContra[key].samples.push(b);
  }

  console.log('\n=== Grouped by Contra Ledger ===');
  for (const [contra, data] of Object.entries(byContra)) {
    console.log('\n' + contra + ': ' + data.count + ' bills, Rs.' + data.total.toLocaleString('en-IN'));
    for (const s of data.samples) {
      console.log('  ' + s.num + ' | ' + s.date + ' | ' + s.type + ' | Rs.' + s.amount.toLocaleString('en-IN') + ' | ' + s.narration);
    }
  }

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
