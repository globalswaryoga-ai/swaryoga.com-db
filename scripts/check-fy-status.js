const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // FY status
  const fys = await db.collection('acc_financial_years').find({}).toArray();
  console.log('=== Financial Years ===');
  fys.forEach(f => console.log(f.code, '| isClosed:', f.isClosed, '| isCurrent:', f.isCurrent, '| start:', f.startDate?.toISOString?.()?.slice(0,10), '| end:', f.endDate?.toISOString?.()?.slice(0,10)));

  // Ledgers per FY
  for (const code of ['2023-24', '2024-25', '2025-26']) {
    const count = await db.collection('acc_ledgers').countDocuments({ financialYear: code, isActive: true });
    const vCount = await db.collection('acc_vouchers').countDocuments({ financialYear: code });
    console.log(`\n${code}: ${count} ledgers, ${vCount} vouchers`);
  }

  // 2024-25 ledger details
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25', isActive: true }).sort({ group: 1, name: 1 }).toArray();
  console.log('\n=== FY 2024-25 Ledgers ===');
  ledgers.forEach(l => {
    const ob = l.openingBalanceType === 'DEBIT' ? l.openingBalance : -l.openingBalance;
    console.log(`  ${l.group.padEnd(10)} ${l.name.padEnd(40)} OB: ${ob.toFixed(2).padStart(12)} ${l.openingBalanceType} | ${l.subGroup || '-'}`);
  });

  // Groups for 2024-25
  const groups = await db.collection('acc_groups').countDocuments({ financialYear: '2024-25' });
  console.log('\nGroups 2024-25:', groups);

  await mongoose.disconnect();
})();
