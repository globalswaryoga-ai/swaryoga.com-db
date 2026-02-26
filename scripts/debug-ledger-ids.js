const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  // Get all ledger IDs
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  const ledgerMap = {};
  ledgers.forEach(l => {
    ledgerMap[l._id.toString()] = l.name;
  });
  console.log('Ledger IDs map:', Object.keys(ledgerMap).length, 'ledgers');
  
  // Get Swar Yoga Income ledger specifically
  const incLedger = ledgers.find(l => l.name === 'Swar Yoga Income');
  console.log('\n=== Swar Yoga Income Ledger ===');
  console.log('_id:', incLedger._id.toString());
  console.log('name:', incLedger.name);
  console.log('group:', incLedger.group);

  // Check voucher entries and see what ledgerId they have
  const vouchers = await db.collection('acc_vouchers').find({ 
    financialYear: '2024-25',
    'entries.ledgerName': 'Swar Yoga Income'
  }).limit(5).toArray();

  console.log('\n=== Sample voucher entries for Swar Yoga Income ===');
  for (const v of vouchers) {
    for (const e of v.entries) {
      if (e.ledgerName === 'Swar Yoga Income') {
        console.log(v.voucherNumber, '| ledgerId:', e.ledgerId, '| ledgerName:', e.ledgerName);
        console.log('  ledgerId matches?', e.ledgerId?.toString() === incLedger._id.toString());
      }
    }
  }

  // Count entries by ledgerId
  const agg = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: '2024-25', isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $group: { _id: { ledgerId: '$entries.ledgerId', type: '$entries.type' }, total: { $sum: '$entries.amount' } } },
    { $sort: { total: -1 } }
  ]).toArray();

  console.log('\n=== Top aggregated entries ===');
  agg.slice(0, 15).forEach(row => {
    const lid = row._id.ledgerId ? row._id.ledgerId.toString() : 'UNDEFINED';
    const ledgerName = ledgerMap[lid] || 'NOT FOUND';
    console.log(row._id.type, '|', lid.substr(0, 12) + '...', '|', ledgerName, '|', row.total);
  });

  await m.disconnect();
})();
