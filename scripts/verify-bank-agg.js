const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  // Check what the engine aggregate would return
  const bankAgg = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: '2024-25', isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $match: { 'entries.ledgerName': { $regex: /bank/i } } },
    { $group: { _id: '$entries.type', total: { $sum: '$entries.amount' } } },
  ]).toArray();

  console.log('Bank aggregate result:');
  bankAgg.forEach(r => console.log('  ', r._id, ':', r.total.toFixed(2)));

  // Check which ledger names contain "bank"
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  const bankLedgers = ledgers.filter(l => /bank/i.test(l.name));
  console.log('\nLedgers matching /bank/i:');
  bankLedgers.forEach(l => console.log('  -', l.name, '|', l.group));

  // Also check: should the ₹5000 extra voucher be removed?
  const badVoucher = await db.collection('acc_vouchers').findOne({ 
    financialYear: '2024-25', 
    voucherNumber: 'SY-2425-057' 
  });
  if (badVoucher) {
    console.log('\n=== SY-2425-057 details ===');
    console.log('Type:', badVoucher.type);
    console.log('Date:', badVoucher.date);
    console.log('Narration:', badVoucher.narration);
    console.log('Entries:', JSON.stringify(badVoucher.entries.map(e => e.ledgerName + ' ' + e.type + ' ' + e.amount)));
  }

  // Total income (INCOME group) + Total P&L expense
  let plIncome = 0, plExpense = 0;
  for (const l of ledgers) {
    // Find all voucher entries for this ledger
    const entries = [];
    const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
    for (const v of vouchers) {
      for (const e of v.entries) {
        if (e.ledgerId && e.ledgerId.toString() === l._id.toString()) {
          entries.push(e);
        }
      }
    }
    const cr = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + (e.amount || 0), 0);
    const dr = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + (e.amount || 0), 0);
    
    if (l.group === 'INCOME' && cr - dr > 0) plIncome += cr - dr;
    if (l.group === 'EXPENSE' && dr - cr > 0) plExpense += dr - cr;
  }
  
  console.log('\n=== P&L FIGURES ===');
  console.log('Total Income (P&L):', plIncome.toFixed(2));
  console.log('Total Expense (P&L):', plExpense.toFixed(2));
  console.log('Net:', (plIncome - plExpense).toFixed(2));

  await mongoose.disconnect();
})();
