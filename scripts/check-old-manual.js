#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // Check old manual balances
  const balances = await db.collection('tally_manual_balances').find({}).toArray();
  console.log('=== Old Manual Balances (' + balances.length + ') ===');
  balances.forEach(b => console.log(
    b.name, '|', b.group, '|', b.subGroup,
    '| OB:', b.openingBalance, b.openingBalanceType,
    '| FY:', b.financialYear
  ));

  // Check a few old vouchers
  const vouchers = await db.collection('tally_manual_vouchers').find({}).limit(20).toArray();
  console.log('\n=== Old Manual Vouchers (first 20 of ' + await db.collection('tally_manual_vouchers').countDocuments() + ') ===');
  vouchers.forEach(v => {
    console.log(v.voucherType, '|', v.date, '|', (v.narration || '').substring(0, 50));
    if (v.entries) v.entries.forEach(e => console.log('  ', e.ledgerName || e.ledgerId, e.type, e.amount));
  });

  await mongoose.disconnect();
})();
