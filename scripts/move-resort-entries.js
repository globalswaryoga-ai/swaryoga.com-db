const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  // 1. Create 'Paid Dividend' ledger (LIABILITY)
  const existing = await db.collection('acc_ledgers').findOne({ name: 'Paid Dividend' });
  let dividendId;
  if (!existing) {
    const r = await db.collection('acc_ledgers').insertOne({
      name: 'Paid Dividend', group: 'LIABILITY', subGroup: 'Current Liabilities',
      openingBalance: 0, openingBalanceType: 'Cr', balanceType: 'Cr',
      financialYear: '2024-25', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    dividendId = r.insertedId;
    console.log('Created Paid Dividend ledger:', dividendId);
  } else {
    dividendId = existing._id;
    console.log('Paid Dividend already exists:', dividendId);
  }

  // 2. Get Miscellaneous Expenses ledger ID
  const miscLedger = await db.collection('acc_ledgers').findOne({ name: 'Miscellaneous Expenses' });
  const miscId = miscLedger._id;
  console.log('Misc Expenses ID:', miscId);

  // 3. Get Resort Project ledger ID
  const resortLedger = await db.collection('acc_ledgers').findOne({ name: 'Swar Yoga Resort Project' });
  const resortId = resortLedger._id;
  console.log('Resort Project ID:', resortId);

  // People to move
  const moveToExpense = ['LAXMI MOHAN', 'TURYA MOHAN', 'PANDURANG KRISH', 'KIRANKUMAR'];
  const moveToDiv = ['ARVIND'];

  // 4. Find all Resort Project vouchers (match by ledgerName since ledgerId is ObjectId)
  const RESORT = 'Swar Yoga Resort Project';
  const vouchers = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    'entries.ledgerName': RESORT
  }).toArray();

  let movedExp = 0, movedDiv = 0, expTotal = 0, divTotal = 0;

  for (const v of vouchers) {
    const narr = (v.narration || '').toUpperCase();
    let targetName = null, targetId = null, category = null;

    // Check Arvind -> Paid Dividend
    if (moveToDiv.some(p => narr.includes(p))) {
      targetName = 'Paid Dividend'; targetId = dividendId; category = 'dividend';
    }
    // Check Laxmi, Turya, Pandurang, Kirankumar -> Misc Expenses
    else if (moveToExpense.some(p => narr.includes(p))) {
      targetName = 'Miscellaneous Expenses'; targetId = miscId; category = 'expense';
    }

    if (targetName) {
      const resortEntry = v.entries.find(e => e.ledgerName === RESORT);
      const amt = resortEntry ? resortEntry.amount : 0;
      const newEntries = v.entries.map(e => {
        if (e.ledgerName === RESORT) {
          return { ...e, ledgerName: targetName, ledgerId: targetId };
        }
        return e;
      });
      await db.collection('acc_vouchers').updateOne({ _id: v._id }, { $set: { entries: newEntries } });

      if (category === 'dividend') { movedDiv++; divTotal += amt; }
      else { movedExp++; expTotal += amt; }
      console.log('  Moved', v.voucherNumber, '->', targetName, '| Rs', amt);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Moved to Misc Expenses:', movedExp, 'vouchers, Rs', expTotal);
  console.log('Moved to Paid Dividend:', movedDiv, 'vouchers, Rs', divTotal);
  console.log('Total removed from Resort Project: Rs', expTotal + divTotal);

  // 5. Verify new Resort Project total
  const remaining = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    'entries.ledgerName': RESORT
  }).toArray();
  let remTotal = 0;
  remaining.forEach(v => {
    const e = v.entries.find(e => e.ledgerName === RESORT);
    if (e) remTotal += e.amount;
  });
  console.log('\nResort Project remaining:', remaining.length, 'vouchers, Rs', remTotal);

  await m.disconnect();
})();
