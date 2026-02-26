const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  // Delete duplicate SY-2425-057 (Rs 5000 not in bank statement)
  const result = await db.collection('acc_vouchers').deleteOne({
    financialYear: '2024-25',
    voucherNumber: 'SY-2425-057'
  });
  console.log('Deleted SY-2425-057:', result.deletedCount);

  // Verify new totals
  const remaining = await db.collection('acc_vouchers').countDocuments({ financialYear: '2024-25' });
  console.log('Remaining vouchers:', remaining);

  // New Kotak bank debit total
  const bankAgg = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: '2024-25', isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $match: { 'entries.ledgerName': 'Kotak Mahindra Bank', 'entries.type': 'DEBIT' } },
    { $group: { _id: null, total: { $sum: '$entries.amount' } } }
  ]).toArray();
  console.log('New Kotak Dr total (Bank Received):', bankAgg[0]?.total?.toFixed(2));

  // New income total
  const incAgg = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: '2024-25', isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $match: { 'entries.ledgerName': 'Swar Yoga Income', 'entries.type': 'CREDIT' } },
    { $group: { _id: null, total: { $sum: '$entries.amount' } } }
  ]).toArray();
  console.log('New Swar Yoga Income Cr total:', incAgg[0]?.total?.toFixed(2));

  await m.disconnect();
})();
