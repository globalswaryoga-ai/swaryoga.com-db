#!/usr/bin/env node
const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });
(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.db;

  // Count ALL documents without FY filter
  const totalLedgers = await db.collection('acc_ledgers').countDocuments();
  const totalVouchers = await db.collection('acc_vouchers').countDocuments();
  console.log('Total acc_ledgers (all FYs):', totalLedgers);
  console.log('Total acc_vouchers (all FYs):', totalVouchers);

  // Check for ledgers WITHOUT financialYear
  const noFY = await db.collection('acc_ledgers').find({ financialYear: { $exists: false } }).toArray();
  console.log('\nLedgers without FY:', noFY.length);
  noFY.forEach(l => console.log(' ', l.name, '|', l.group));

  // Check all unique FY values in ledgers
  const fyValues = await db.collection('acc_ledgers').distinct('financialYear');
  console.log('\nUnique FY values in ledgers:', fyValues);

  // Check all unique FY values in vouchers
  const vFyValues = await db.collection('acc_vouchers').distinct('financialYear');
  console.log('Unique FY values in vouchers:', vFyValues);

  // Check if there are ledgers with the name "AUDIT FEES PAYABLE"
  const audit = await db.collection('acc_ledgers').find({ name: /audit/i }).toArray();
  console.log('\nLedgers matching "audit":', audit.length);
  audit.forEach(l => console.log(' ', l.name, '|', l.group, '|', l.financialYear));

  // Also check old manual for "audit"
  const oldAudit = await db.collection('tally_manual_balances').find({ ledgerName: /audit/i }).toArray();
  console.log('Old manual "audit":', oldAudit.length);
  oldAudit.forEach(l => console.log(' ', l.ledgerName, '|', l.category, '|', l.financialYear));

  // Check if dashboard API might be counting old + new
  const oldBal2324 = await db.collection('tally_manual_balances').find({ financialYear: '2023-24' }).toArray();
  const oldVou2324 = await db.collection('tally_manual_vouchers').countDocuments({ financialYear: '2023-24' });
  console.log('\nOld manual FY 2023-24:', oldBal2324.length, 'balances,', oldVou2324, 'vouchers');

  // Show old manual balance names for 2023-24
  console.log('Old manual balance names (FY 2023-24):');
  oldBal2324.forEach(b => console.log(' ', b.ledgerName, '|', b.parentGroup, '|', b.amount, b.drCr));

  await m.disconnect();
})();
