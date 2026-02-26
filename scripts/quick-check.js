#!/usr/bin/env node
const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });
(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.db;

  for (const fy of ['2023-24', '2024-25']) {
    const ledgers = await db.collection('acc_ledgers').find({ financialYear: fy }).toArray();
    const vouchers = await db.collection('acc_vouchers').countDocuments({ financialYear: fy });
    console.log('FY', fy, '| Ledgers:', ledgers.length, '| Vouchers:', vouchers);
    ledgers.forEach(l => console.log(' ', l.name, '|', l.group, '|', l.subGroup, '| OB:', l.openingBalance, l.openingBalanceType));
  }

  const allV = await db.collection('acc_vouchers').find({}).limit(5).toArray();
  console.log('\nSample vouchers:', allV.length);
  allV.forEach(v => console.log(' ', v.voucherType || v.type, '|', v.financialYear, '|', (v.narration || '').substring(0, 60)));

  // Also check old manual system counts visible to user
  const oldBal = await db.collection('tally_manual_balances').countDocuments({ financialYear: '2023-24' });
  const oldVou = await db.collection('tally_manual_vouchers').countDocuments({ financialYear: '2023-24' });
  console.log('\nOld manual system FY 2023-24:', oldBal, 'balances,', oldVou, 'vouchers');

  const oldBal25 = await db.collection('tally_manual_balances').countDocuments({ financialYear: '2024-25' });
  const oldVou25 = await db.collection('tally_manual_vouchers').countDocuments({ financialYear: '2024-25' });
  console.log('Old manual system FY 2024-25:', oldBal25, 'balances,', oldVou25, 'vouchers');

  await m.disconnect();
})();
