const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');
  const FY = '2024-25';

  // 1. Fetch ALL active ledgers
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: FY, isActive: true }).toArray();
  console.log('Active ledgers:', ledgers.length);

  // 2. Single aggregate: sum debit/credit per ledger
  const agg = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: FY, isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $group: { _id: { ledgerId: '$entries.ledgerId', type: '$entries.type' }, total: { $sum: '$entries.amount' } } },
  ]).toArray();

  console.log('Aggregation rows:', agg.length);

  // Build a lookup: ledgerId -> { periodDebit, periodCredit }
  const voucherTotals = new Map();
  for (const row of agg) {
    const lid = String(row._id.ledgerId);
    if (!voucherTotals.has(lid)) voucherTotals.set(lid, { periodDebit: 0, periodCredit: 0 });
    const entry = voucherTotals.get(lid);
    if (row._id.type === 'DEBIT') entry.periodDebit = row.total;
    if (row._id.type === 'CREDIT') entry.periodCredit = row.total;
  }

  console.log('voucherTotals map size:', voucherTotals.size);

  // 3. Build balance for income ledgers
  console.log('\n=== INCOME LEDGER BALANCES ===');
  let totalIncome = 0;
  
  for (const l of ledgers) {
    if (l.group !== 'INCOME') continue;
    
    const lid = String(l._id);
    const openingDebit = l.openingBalanceType === 'DEBIT' ? (l.openingBalance || 0) : 0;
    const openingCredit = l.openingBalanceType === 'CREDIT' ? (l.openingBalance || 0) : 0;

    const vt = voucherTotals.get(lid) || { periodDebit: 0, periodCredit: 0 };
    
    // Income amount = (openingCredit + periodCredit) - (openingDebit + periodDebit)
    const incomeAmount = (openingCredit + vt.periodCredit) - (openingDebit + vt.periodDebit);
    
    console.log('\nLedger:', l.name);
    console.log('  _id:', lid);
    console.log('  Opening: Dr', openingDebit, 'Cr', openingCredit);
    console.log('  Period: Dr', vt.periodDebit, 'Cr', vt.periodCredit);
    console.log('  Income amount (Cr - Dr):', incomeAmount);
    
    if (Math.abs(incomeAmount) > 0.01) {
      totalIncome += Math.abs(incomeAmount);
    }
  }

  console.log('\n=== TOTAL INCOME ===', totalIncome);

  await m.disconnect();
})();
