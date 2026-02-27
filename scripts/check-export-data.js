require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  // 1. Capital ledgers
  const cap = await db.collection('acc_ledgers').find({ group: 'CAPITAL' }).project({ name:1, subGroup:1, openingBalance:1, openingBalanceType:1, financialYear:1 }).toArray();
  console.log('=== CAPITAL LEDGERS ===');
  cap.forEach(l => console.log(' ', l.name, '|', l.subGroup, '| OB:', l.openingBalance, l.openingBalanceType, '| FY:', l.financialYear));
  if (!cap.length) console.log('  (none)');

  // 2. P&L A/c ledger
  const pl = await db.collection('acc_ledgers').find({ name: /profit|loss/i }).project({ name:1, group:1 }).toArray();
  console.log('\n=== P&L related Ledgers ===');
  pl.forEach(l => console.log(' ', l.name, '| group:', l.group));
  if (!pl.length) console.log('  (none)');

  // 3. Sample vouchers
  const sv = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).limit(2).project({ type:1, voucherNumber:1, entries:1 }).toArray();
  console.log('\n=== Sample Vouchers FY 2024-25 ===');
  sv.forEach(v => {
    console.log(' ', v.type, v.voucherNumber);
    (v.entries || []).forEach(e => console.log('    ', e.type, e.ledgerName, e.amount));
  });

  // 4. Voucher counts
  const vc25 = await db.collection('acc_vouchers').countDocuments({ financialYear: '2024-25' });
  const vc24 = await db.collection('acc_vouchers').countDocuments({ financialYear: '2023-24' });
  console.log('\n=== Voucher Counts ===');
  console.log('  FY 2024-25:', vc25, '| FY 2023-24:', vc24);

  // 5. Nominal ledgers with OBs
  const nom = await db.collection('acc_ledgers').find({ group: { $in: ['INCOME','EXPENSE'] }, openingBalance: { $gt: 0 } }).project({ name:1, group:1, openingBalance:1, financialYear:1 }).toArray();
  console.log('\n=== Nominal Ledgers with OBs ===');
  nom.forEach(l => console.log(' ', l.group, l.name, 'OB:', l.openingBalance, 'FY:', l.financialYear));
  if (!nom.length) console.log('  (none)');

  // 6. Financial years
  const fys = await db.collection('acc_financial_years').find({}).toArray();
  console.log('\n=== Financial Years ===');
  fys.forEach(f => console.log(' ', f.code, '| Company:', f.companyName));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
