const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  // Get all ledgers
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  const ledgerById = {};
  const ledgerByName = {};
  ledgers.forEach(l => {
    ledgerById[l._id.toString()] = l.name;
    ledgerByName[l.name] = l._id.toString();
  });

  console.log('=== Checking if voucher entry ledgerIds match their ledgerNames ===\n');

  // Get all vouchers
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  
  let mismatchCount = 0;
  let matchCount = 0;
  const mismatches = [];

  for (const v of vouchers) {
    for (const e of v.entries || []) {
      const entryLedgerId = e.ledgerId?.toString();
      const expectedLedgerId = ledgerByName[e.ledgerName];
      const actualLedgerName = ledgerById[entryLedgerId] || 'NOT FOUND';
      
      if (entryLedgerId !== expectedLedgerId) {
        mismatchCount++;
        if (mismatches.length < 10) {
          mismatches.push({
            voucher: v.voucherNumber,
            entryLedgerName: e.ledgerName,
            entryLedgerId: entryLedgerId,
            actualLedgerName: actualLedgerName,
            expectedLedgerId: expectedLedgerId
          });
        }
      } else {
        matchCount++;
      }
    }
  }

  console.log('Matching entries:', matchCount);
  console.log('MISMATCHED entries:', mismatchCount);

  if (mismatches.length > 0) {
    console.log('\n=== Sample mismatches ===');
    mismatches.forEach(m => {
      console.log(`\nVoucher: ${m.voucher}`);
      console.log(`  Entry says ledgerName: "${m.entryLedgerName}"`);
      console.log(`  Entry has ledgerId: ${m.entryLedgerId} -> actual name: "${m.actualLedgerName}"`);
      console.log(`  Expected ledgerId for "${m.entryLedgerName}": ${m.expectedLedgerId}`);
    });
  }

  await m.disconnect();
})();
