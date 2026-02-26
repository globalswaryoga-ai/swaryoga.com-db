const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  const cash = await db.collection('acc_ledgers').findOne({ name: 'Cash-in-Hand', financialYear: '2024-25' });
  const syi = await db.collection('acc_ledgers').findOne({ name: 'Swar Yoga Income', financialYear: '2024-25' });

  await db.collection('acc_vouchers').insertOne({
    voucherNumber: 'REC-WS-2425-003',
    type: 'RECEIPT',
    date: new Date('2024-10-10'),
    financialYear: '2024-25',
    entries: [
      { ledgerId: cash._id, ledgerName: 'Cash-in-Hand', type: 'DEBIT', amount: 90000 },
      { ledgerId: syi._id, ledgerName: 'Swar Yoga Income', type: 'CREDIT', amount: 90000 },
    ],
    totalDebit: 90000,
    totalCredit: 90000,
    narration: 'Swar Yoga Workshop Fees Received - Cash',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('CREATED: REC-WS-2425-003 | 10 Oct 2024 | Rs 90,000');
  console.log('  Dr Cash-in-Hand     Rs 90,000');
  console.log('  Cr Swar Yoga Income Rs 90,000');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
