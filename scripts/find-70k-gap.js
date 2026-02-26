const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  // Get ALL voucher entries that DEBIT Kotak (money coming IN)
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();

  let bankReceivedTotal = 0;
  let bankReceivedCount = 0;
  const bankReceivedBreakdown = {};

  for (const v of vouchers) {
    for (const e of v.entries || []) {
      if (e.ledgerName === 'Kotak Mahindra Bank' && e.type === 'DEBIT') {
        bankReceivedTotal += e.amount;
        bankReceivedCount++;
        // Find what the credit side is
        const creditEntry = v.entries.find(x => x.type === 'CREDIT');
        const source = creditEntry ? creditEntry.ledgerName : 'Unknown';
        bankReceivedBreakdown[source] = (bankReceivedBreakdown[source] || 0) + e.amount;
      }
    }
  }

  console.log('=== TOTAL BANK RECEIVED (Credits to Bank A/C) ===');
  console.log('Total:', bankReceivedTotal.toFixed(2));
  console.log('Count:', bankReceivedCount);
  console.log('\nBreakdown by source:');
  const sorted = Object.entries(bankReceivedBreakdown).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([name, amt]) => console.log('  ', name, ':', amt.toFixed(2)));

  // Check what's in bank credits from statement that we DIDN'T capture
  // Target: 12,91,896.72 total bank credits
  // Current: bankReceivedTotal
  console.log('\n=== GAP ANALYSIS ===');
  console.log('Expected total bank credits: 12,91,896.72');
  console.log('Current total bank debits:', bankReceivedTotal.toFixed(2));
  console.log('Gap:', (1291896.72 - bankReceivedTotal).toFixed(2));

  await m.disconnect();
})();
