const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  const count = await db.collection('acc_vouchers').countDocuments();
  console.log('acc_vouchers total:', count);

  const active = await db.collection('acc_vouchers').countDocuments({ isReversed: { $ne: true } });
  console.log('Active (not reversed):', active);

  const noReceipt = await db.collection('acc_vouchers').countDocuments({
    isReversed: { $ne: true },
    $or: [{ receiptFileUrl: { $exists: false } }, { receiptFileUrl: null }, { receiptFileUrl: '' }]
  });
  console.log('Active without receipt:', noReceipt);

  if (active > 0) {
    const sample = await db.collection('acc_vouchers').find({ isReversed: { $ne: true } }).limit(5).toArray();
    for (const s of sample) {
      console.log('\n--- Voucher ---');
      console.log('Number:', s.voucherNumber, '| Type:', s.type, '| Date:', s.date);
      console.log('Narration:', s.narration);
      console.log('TotalDebit:', s.totalDebit, '| TotalCredit:', s.totalCredit);
      console.log('receiptFileUrl:', s.receiptFileUrl || '(none)');
      console.log('Entries:', JSON.stringify(s.entries));
      console.log('FY:', s.financialYear);
    }
  }

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
