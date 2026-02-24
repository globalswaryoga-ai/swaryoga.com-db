#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');

  // All vouchers by type
  const byType = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: '2024-25' } },
    { $group: { _id: '$voucherType', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('=== Vouchers by Type ===');
  byType.forEach(t => console.log(`${t._id}: Rs ${t.total.toFixed(2)} (${t.count} entries)`));

  // Receipt vouchers breakdown by ledger
  const receipts = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Receipt' } },
    { $group: { _id: '$ledgerName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray();
  console.log('\n=== Receipt Vouchers by Ledger ===');
  let rcpTotal = 0;
  receipts.forEach(r => { rcpTotal += r.total; console.log(`${r._id}: Rs ${r.total.toFixed(2)} (${r.count})`); });
  console.log(`TOTAL RECEIPTS: Rs ${rcpTotal.toFixed(2)}`);

  // Payment vouchers breakdown by ledger
  const payments = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Payment' } },
    { $group: { _id: '$ledgerName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray();
  console.log('\n=== Payment Vouchers by Ledger ===');
  let payTotal = 0;
  payments.forEach(r => { payTotal += r.total; console.log(`${r._id}: Rs ${r.total.toFixed(2)} (${r.count})`); });
  console.log(`TOTAL PAYMENTS: Rs ${payTotal.toFixed(2)}`);

  // Contra / Journal / other types
  const others = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: '2024-25', voucherType: { $nin: ['Receipt', 'Payment'] } } },
    { $group: { _id: { type: '$voucherType', ledger: '$ledgerName' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray();
  console.log('\n=== Other Voucher Types ===');
  others.forEach(r => console.log(`${r._id.type} | ${r._id.ledger}: Rs ${r.total.toFixed(2)} (${r.count})`));

  // Bank statement totals for reference
  console.log('\n=== Bank Statement Reference ===');
  console.log('Total Bank Deposits: Rs 12,91,896.72 (165 txns)');
  console.log('Total Bank Withdrawals: Rs 12,85,586.53 (415 txns)');

  // Check what categories the receipts fall under
  const rcpByNarration = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Receipt' } },
    { $project: { amount: 1, narration: 1, ledgerName: 1, month: { $month: { $dateFromString: { dateString: '$date' } } } } },
    { $sort: { month: 1 } }
  ]).toArray();
  console.log('\n=== All Receipt Vouchers (monthly) ===');
  rcpByNarration.forEach(r => console.log(`${r.ledgerName} | Rs ${r.amount} | ${r.narration?.substring(0, 80)}`));

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
