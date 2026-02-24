/**
 * Check opening balances and voucher aggregates for FY 2024-25
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) { console.error('No MONGODB_URI_MAIN'); process.exit(1); }

  await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  // 1. Check tally_manual_balances for FY 2024-25
  const balances = await db.collection('tally_manual_balances').find({ financialYear: '2024-25' }).toArray();
  console.log('=== FY 2024-25 Opening Balances ===');
  console.log('Total entries:', balances.length);
  for (const b of balances) {
    const cat = (b.category || '').padEnd(10);
    const name = (b.ledgerName || '').padEnd(45);
    const dc = b.drCr || 'Dr';
    const amt = (b.amount || 0).toLocaleString('en-IN');
    console.log(`  ${cat} | ${name} | ${dc} | Rs ${amt.padStart(12)} | ${b.createdBy || '-'}`);
  }

  // 2. Aggregate vouchers by ledgerName
  const voucherLedgers = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: '2024-25' } },
    { $group: { _id: { ledgerName: '$ledgerName', voucherType: '$voucherType' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { '_id.voucherType': 1, total: -1 } }
  ]).toArray();

  console.log('\n=== FY 2024-25 Voucher Aggregates by Ledger ===');
  for (const v of voucherLedgers) {
    const vt = (v._id.voucherType || '').padEnd(10);
    const ln = (v._id.ledgerName || '').padEnd(45);
    console.log(`  ${vt} | ${ln} | Count: ${v.count} | Rs ${v.total.toLocaleString('en-IN')}`);
  }

  // 3. Find ledger names that exist in balances but NOT in vouchers, and vice versa
  const balanceLedgers = new Set(balances.map(b => b.ledgerName));
  const voucherLedgerNames = new Set(voucherLedgers.map(v => v._id.ledgerName));

  console.log('\n=== Ledgers in Balances but NOT in Vouchers ===');
  for (const l of balanceLedgers) {
    if (!voucherLedgerNames.has(l)) console.log(`  ${l}`);
  }

  console.log('\n=== Ledgers in Vouchers but NOT in Balances ===');
  for (const l of voucherLedgerNames) {
    if (!balanceLedgers.has(l)) console.log(`  ${l}`);
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
