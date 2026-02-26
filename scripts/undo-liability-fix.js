// Undo: Move 119 vouchers back from Other Current Liabilities → Miscellaneous Expenses
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  const miscLedger = await db.collection('acc_ledgers').findOne({ name: 'Miscellaneous Expenses', financialYear: '2024-25' });
  if (!miscLedger) throw new Error('Miscellaneous Expenses ledger not found');

  // Find all vouchers where debit entry = Other Current Liabilities (the ones we wrongly moved)
  const vouchers = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    type: 'PAYMENT',
    'entries.ledgerName': 'Other Current Liabilities'
  }).toArray();

  console.log('Vouchers to revert: ' + vouchers.length);
  const total = vouchers.reduce((s, v) => s + v.totalDebit, 0);
  console.log('Total: Rs ' + total.toFixed(2));

  let updated = 0;
  for (const v of vouchers) {
    await db.collection('acc_vouchers').updateOne(
      { _id: v._id, 'entries.ledgerName': 'Other Current Liabilities' },
      {
        $set: {
          'entries.$.ledgerName': 'Miscellaneous Expenses',
          'entries.$.ledgerId': miscLedger._id,
        }
      }
    );
    updated++;
  }

  console.log('Reverted: ' + updated + ' vouchers back to Miscellaneous Expenses');
  console.log('Other Current Liabilities OB stays at Rs 3,25,000 (unchanged)');
  console.log('Rs ' + total.toFixed(2) + ' now shows as EXPENSE (loss in P&L)');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
