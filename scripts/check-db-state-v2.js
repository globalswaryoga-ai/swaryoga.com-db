#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // ACC collections
  const collections = await db.listCollections().toArray();
  const accCols = collections.filter(c => c.name.startsWith('acc_'));
  console.log('ACC collections:', accCols.map(c => c.name));

  // FY 2024-25 ledgers
  const ledgers2425 = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  console.log('\n=== FY 2024-25 Ledgers (' + ledgers2425.length + ') ===');
  ledgers2425.forEach(l => console.log(l.name, '|', l.group, '|', l.subGroup, '| OB:', l.openingBalance, l.openingBalanceType));

  // FY 2023-24 ledgers
  const ledgers2324 = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  console.log('\n=== FY 2023-24 Ledgers (' + ledgers2324.length + ') ===');
  ledgers2324.forEach(l => console.log(l.name, '|', l.group, '|', l.subGroup, '| OB:', l.openingBalance, l.openingBalanceType));

  // FY 2024-25 vouchers
  const vouchers2425 = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  console.log('\n=== FY 2024-25 Vouchers (' + vouchers2425.length + ') ===');
  vouchers2425.forEach(v => {
    console.log(v.voucherType, '|', (v.narration || '').substring(0, 60));
    if (v.entries) v.entries.forEach(e => console.log('  ', e.ledgerId, e.type, e.amount));
  });

  // FY 2023-24 vouchers
  const vouchers2324 = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();
  console.log('\n=== FY 2023-24 Vouchers:', vouchers2324.length, '===');

  // Financial years
  const fys = await db.collection('acc_financial_years').find({}).toArray();
  console.log('\n=== Financial Years ===');
  fys.forEach(f => console.log(f.code, '| isClosed:', f.isClosed, '| isCurrent:', f.isCurrent));

  // Old manual system
  const manualBal = await db.collection('tally_manual_balances').countDocuments();
  const manualVou = await db.collection('tally_manual_vouchers').countDocuments();
  console.log('\n=== Old Manual System ===');
  console.log('tally_manual_balances:', manualBal);
  console.log('tally_manual_vouchers:', manualVou);

  await mongoose.disconnect();
})();
