const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_vouchers');

  // Get all FY 2024-25 vouchers grouped by type and ledger
  const receipts = await col.aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Receipt' } },
    { $group: { _id: '$ledgerName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray();

  const payments = await col.aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Payment' } },
    { $group: { _id: '$ledgerName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray();

  const contras = await col.aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Contra' } },
    { $group: { _id: '$ledgerName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray();

  console.log('=== RECEIPTS (Income side in P&L) ===');
  let totalReceipts = 0, capitalReceipts = 0;
  const CAPITAL = ['Investment Received', 'Share Capital', 'Loan Received'];
  for (const r of receipts) {
    const isCapital = CAPITAL.includes(r._id);
    console.log(`  ${isCapital ? '🚫 CAPITAL' : '✅ INCOME'} ${r._id}: ₹${r.total.toLocaleString('en-IN')} (${r.count} txns)`);
    totalReceipts += r.total;
    if (isCapital) capitalReceipts += r.total;
  }
  console.log(`  TOTAL RECEIPTS: ₹${totalReceipts.toLocaleString('en-IN')}`);
  console.log(`  CAPITAL (excluded): ₹${capitalReceipts.toLocaleString('en-IN')}`);
  console.log(`  P&L INCOME: ₹${(totalReceipts - capitalReceipts).toLocaleString('en-IN')}`);

  console.log('\n=== PAYMENTS (Expense side in P&L) ===');
  let totalPayments = 0;
  for (const p of payments) {
    console.log(`  ${p._id}: ₹${p.total.toLocaleString('en-IN')} (${p.count} txns)`);
    totalPayments += p.total;
  }
  console.log(`  TOTAL PAYMENTS: ₹${totalPayments.toLocaleString('en-IN')}`);

  console.log('\n=== CONTRA ===');
  let totalContra = 0;
  for (const c of contras) {
    console.log(`  ${c._id}: ₹${c.total.toLocaleString('en-IN')} (${c.count} txns)`);
    totalContra += c.total;
  }
  console.log(`  TOTAL CONTRA: ₹${totalContra.toLocaleString('en-IN')}`);

  const plIncome = totalReceipts - capitalReceipts;
  console.log('\n=== P&L SUMMARY (from vouchers) ===');
  console.log(`  Income: ₹${plIncome.toLocaleString('en-IN')}`);
  console.log(`  Expenses: ₹${totalPayments.toLocaleString('en-IN')}`);
  console.log(`  Net: ₹${(plIncome - totalPayments).toLocaleString('en-IN')}`);

  console.log('\n=== PROBLEM: These payments are NOT P&L expenses ===');
  // Identify capital/non-P&L payments
  const nonPL = ['Resort Project', 'Dividend', 'Cash Withdrawal', 'ATM', 'Self Transfer', 'Loan Repayment'];
  let nonPLtotal = 0;
  for (const p of payments) {
    for (const tag of nonPL) {
      if (p._id.toLowerCase().includes(tag.toLowerCase())) {
        console.log(`  ❌ ${p._id}: ₹${p.total.toLocaleString('en-IN')} → should be excluded`);
        nonPLtotal += p.total;
      }
    }
  }
  console.log(`  TOTAL NON-P&L PAYMENTS: ₹${nonPLtotal.toLocaleString('en-IN')}`);
  console.log(`  CORRECTED EXPENSES: ₹${(totalPayments - nonPLtotal).toLocaleString('en-IN')}`);
  console.log(`  CORRECTED NET P&L: ₹${(plIncome - totalPayments + nonPLtotal).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
}
check();
