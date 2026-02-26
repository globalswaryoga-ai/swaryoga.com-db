const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  console.log('Total vouchers for FY 2024-25:', vouchers.length);

  // Find all entries that involve income ledgers
  const incomeLedgers = ['Swar Yoga Income', 'Bank Interest Received', 'Other Income', 'Old Workshop Fees'];
  
  let totalIncomeCredits = 0;
  let incomeVoucherCount = 0;

  for (const v of vouchers) {
    for (const e of v.entries || []) {
      if (incomeLedgers.includes(e.ledgerName)) {
        incomeVoucherCount++;
        if (e.type === 'CREDIT') {
          totalIncomeCredits += e.amount || 0;
        }
        console.log(v.voucherNumber, '|', e.ledgerName, '|', e.type, '|', e.amount);
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Entries involving income ledgers:', incomeVoucherCount);
  console.log('Total income credits:', totalIncomeCredits);

  await m.disconnect();
})();
