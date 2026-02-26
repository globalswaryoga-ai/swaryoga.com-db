// Fix: Reassign Miscellaneous Expenses payments to reduce Other Current Liabilities (₹3,25,000)
// User wants ALL general payments to reduce the ₹3,25,000 liability
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const ledgerCol = db.collection('acc_ledgers');
  const voucherCol = db.collection('acc_vouchers');

  // Get Other Current Liabilities ledger (₹3,25,000)
  const oclLedger = await ledgerCol.findOne({ name: 'Other Current Liabilities', financialYear: '2024-25' });
  console.log('Liability ledger: ' + oclLedger.name + ' | OB: ₹' + oclLedger.openingBalance);

  // Get ALL Miscellaneous Expenses payments (these should reduce the liability)
  const miscVouchers = await voucherCol.find({
    financialYear: '2024-25',
    type: 'PAYMENT',
    'entries.ledgerName': 'Miscellaneous Expenses'
  }).sort({ date: 1 }).toArray();

  console.log('Miscellaneous vouchers to reassign: ' + miscVouchers.length);
  const totalMisc = miscVouchers.reduce((s, v) => s + v.totalDebit, 0);
  console.log('Total: ₹' + totalMisc.toFixed(2));

  // Cap at ₹3,25,000
  const liabCap = 325000;
  let running = 0;
  let updated = 0;

  for (const v of miscVouchers) {
    const amt = v.totalDebit;
    if (running + amt > liabCap) {
      // Would exceed - leave as Miscellaneous Expenses
      console.log('  CAP reached at ₹' + running.toFixed(2) + ', voucher ' + v.voucherNumber + ' (₹' + amt + ') stays as Misc');
      continue;
    }

    // Update debit entry: Miscellaneous Expenses → Other Current Liabilities
    await voucherCol.updateOne(
      { _id: v._id, 'entries.ledgerName': 'Miscellaneous Expenses' },
      {
        $set: {
          'entries.$.ledgerName': oclLedger.name,
          'entries.$.ledgerId': oclLedger._id,
        }
      }
    );

    running += amt;
    updated++;
  }

  console.log('\nUpdated: ' + updated + ' vouchers');
  console.log('Liability reduced by: ₹' + running.toFixed(2));
  console.log('Remaining liability: ₹' + (liabCap - running).toFixed(2));

  // Check remaining Miscellaneous
  const remainMisc = await voucherCol.find({
    financialYear: '2024-25',
    type: 'PAYMENT',
    'entries.ledgerName': 'Miscellaneous Expenses'
  }).toArray();
  console.log('\nRemaining Miscellaneous: ' + remainMisc.length + ' vouchers = ₹' + remainMisc.reduce((s,v) => s + v.totalDebit, 0).toFixed(2));

  // Check OCL vouchers
  const oclVouchers = await voucherCol.find({
    financialYear: '2024-25',
    'entries.ledgerName': 'Other Current Liabilities'
  }).toArray();
  console.log('Other Current Liabilities vouchers: ' + oclVouchers.length + ' = ₹' + oclVouchers.reduce((s,v) => s + v.totalDebit, 0).toFixed(2));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
