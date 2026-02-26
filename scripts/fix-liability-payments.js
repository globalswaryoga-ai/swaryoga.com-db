// Fix: Reassign Miscellaneous Expenses > ₹1,000 to reduce Short-Term Provisions (₹3,25,000 liability)
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const ledgerCol = db.collection('acc_ledgers');
  const voucherCol = db.collection('acc_vouchers');

  // Get liability ledger
  const liabLedgers = await ledgerCol.find({ financialYear: '2024-25', group: 'LIABILITY' }).toArray();
  console.log('LIABILITY ledgers:');
  liabLedgers.forEach(l => console.log('  ' + l.name + ' | ' + l.subGroup + ' | OB: ' + l.openingBalance + ' ' + l.balanceType));

  // Find the Short-Term Provisions ledger (or Other Current Liabilities)
  const stp = liabLedgers.find(l => l.name === 'Short-Term Provisions') || liabLedgers.find(l => l.name === 'Other Current Liabilities');
  if (!stp) {
    console.log('No liability ledger found!');
    await mongoose.disconnect();
    return;
  }
  console.log('\nTarget liability ledger: ' + stp.name + ' (OB: ' + stp.openingBalance + ')');

  // Find Miscellaneous Expenses vouchers > ₹1,000
  const miscVouchers = await voucherCol.find({
    financialYear: '2024-25',
    type: 'PAYMENT',
    'entries.ledgerName': 'Miscellaneous Expenses',
    totalDebit: { $gt: 1000 }
  }).toArray();

  console.log('\nMisc vouchers > ₹1,000: ' + miscVouchers.length);
  const totalMiscOver1k = miscVouchers.reduce((s, v) => s + v.totalDebit, 0);
  console.log('Total amount: ₹' + totalMiscOver1k.toFixed(2));

  // We need to cap at ₹3,25,000
  const liabCap = 325000;
  let running = 0;
  let updated = 0;
  let capped = false;

  // Sort by date
  miscVouchers.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const v of miscVouchers) {
    if (capped) break;

    const amt = v.totalDebit;
    if (running + amt > liabCap) {
      // This voucher would exceed cap - skip it (leave as Miscellaneous)
      capped = true;
      console.log('  CAP reached at ₹' + running.toFixed(2) + ', remaining vouchers stay as Miscellaneous');
      continue;
    }

    // Update debit entry from Miscellaneous Expenses → Short-Term Provisions
    await voucherCol.updateOne(
      { _id: v._id, 'entries.ledgerName': 'Miscellaneous Expenses' },
      {
        $set: {
          'entries.$.ledgerName': stp.name,
          'entries.$.ledgerId': stp._id,
        }
      }
    );

    running += amt;
    updated++;
  }

  console.log('\nUpdated: ' + updated + ' vouchers');
  console.log('Total liability reduced: ₹' + running.toFixed(2) + ' / ₹' + liabCap);

  // Check remaining Miscellaneous
  const remainMisc = await voucherCol.find({
    financialYear: '2024-25',
    type: 'PAYMENT',
    'entries.ledgerName': 'Miscellaneous Expenses'
  }).toArray();
  const remainTotal = remainMisc.reduce((s, v) => s + v.totalDebit, 0);
  console.log('\nRemaining Miscellaneous: ' + remainMisc.length + ' vouchers = ₹' + remainTotal.toFixed(2));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
