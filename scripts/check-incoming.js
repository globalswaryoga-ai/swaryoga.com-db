/**
 * Check if total incoming (bank deposits) matches ₹12,91,896.72
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');
  const v = mongoose.connection.collection('tally_manual_vouchers');

  // 1. Income entries from balance sheet
  const income = await b.find({ financialYear: '2024-25', category: 'income' }).toArray();
  console.log('── INCOME (Balance Sheet Entries) ──');
  let totalIncome = 0;
  for (const x of income) {
    console.log('  ' + x.ledgerName.padEnd(30) + ' | Rs.' + x.amount.toFixed(2));
    totalIncome += x.amount;
  }
  console.log('  TOTAL INCOME: Rs.' + totalIncome.toFixed(2));

  // 2. Receipt vouchers
  const receipts = await v.find({ financialYear: '2024-25', voucherType: 'Receipt' }).toArray();
  let totalReceipts = 0;
  let investmentReceipts = 0;
  let incomeReceipts = 0;
  console.log('\n── RECEIPT VOUCHERS (monthly) ──');
  for (const r of receipts) {
    const cr = r.creditLedger || '';
    const isInvestment = cr.toLowerCase().includes('share') || cr.toLowerCase().includes('capital');
    if (isInvestment) investmentReceipts += r.amount;
    else incomeReceipts += r.amount;
    console.log('  ' + (r.date || '').padEnd(12) + ' | ' + (r.debitLedger || '').padEnd(25) + ' | ' + cr.padEnd(30) + ' | Rs.' + r.amount.toFixed(2));
    totalReceipts += r.amount;
  }
  console.log('  TOTAL RECEIPTS: Rs.' + totalReceipts.toFixed(2));
  console.log('    Investment: Rs.' + investmentReceipts.toFixed(2));
  console.log('    Income:     Rs.' + incomeReceipts.toFixed(2));

  // 3. Contra vouchers (Cash → Bank)
  const contras = await v.find({ financialYear: '2024-25', voucherType: 'Contra' }).toArray();
  let totalContra = 0;
  console.log('\n── CONTRA VOUCHERS ──');
  for (const c of contras) {
    console.log('  ' + (c.date || '') + ' | ' + (c.debitLedger || '') + ' → ' + (c.creditLedger || '') + ' | Rs.' + c.amount.toFixed(2));
    totalContra += c.amount;
  }
  console.log('  TOTAL CONTRA: Rs.' + totalContra.toFixed(2));

  // 4. Bank deposits = Receipts into bank + Contra (cash→bank)
  const totalBankDeposits = totalReceipts + totalContra;
  const expected = 1291896.72;

  console.log('\n' + '═'.repeat(55));
  console.log('  INCOMING BALANCE CHECK');
  console.log('═'.repeat(55));
  console.log('  Receipt Vouchers:     Rs.' + totalReceipts.toFixed(2));
  console.log('  Contra (Cash→Bank):   Rs.' + totalContra.toFixed(2));
  console.log('  ───────────────────────────────');
  console.log('  OUR TOTAL INTO BANK:  Rs.' + totalBankDeposits.toFixed(2));
  console.log('  BANK STMT DEPOSITS:   Rs.' + expected.toFixed(2));
  console.log('  DIFFERENCE:           Rs.' + (totalBankDeposits - expected).toFixed(2));
  console.log('═'.repeat(55));

  if (Math.abs(totalBankDeposits - expected) < 1) {
    console.log('  ✅ MATCH! Incoming balance is correct.');
  } else {
    console.log('  ❌ MISMATCH of Rs.' + Math.abs(totalBankDeposits - expected).toFixed(2));
  }

  await mongoose.disconnect();
}
run();
