const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const v = mongoose.connection.collection('tally_manual_vouchers');
  const b = mongoose.connection.collection('tally_manual_balances');

  // Receipt vouchers for 2024-25
  const receipts = await v.find({ financialYear: '2024-25', voucherType: 'Receipt' }).sort({ amount: -1 }).toArray();
  console.log('=== RECEIPT VOUCHERS (2024-25) ===');
  console.log('Count:', receipts.length);
  let totalReceipts = 0;
  let investTotal = 0;
  let courseTotal = 0;
  for (const r of receipts) {
    totalReceipts += r.amount;
    const party = r.partyName || '';
    const narr = r.narration || '';
    const ledger = r.ledgerName || '';
    const combined = party + narr + ledger;
    const isInvest = /invest|capital|loan|share/i.test(combined);
    if (isInvest) investTotal += r.amount;
    else courseTotal += r.amount;
    console.log('  ' + r.date + ' | Rs.' + r.amount + ' | ' + party + ' | ' + ledger + (isInvest ? ' *** INVESTMENT ***' : ''));
  }
  console.log('Total Receipts: Rs.' + totalReceipts);
  console.log('Investment Receipts: Rs.' + investTotal);
  console.log('Course/Other Receipts: Rs.' + courseTotal);

  // Payment stats
  const payments = await v.find({ financialYear: '2024-25', voucherType: 'Payment' }).toArray();
  let totalPay = 0;
  for (const p of payments) totalPay += p.amount;
  console.log('\nPayment vouchers: ' + payments.length + ', Total: Rs.' + totalPay);

  // Contra stats
  const contras = await v.find({ financialYear: '2024-25', voucherType: 'Contra' }).toArray();
  let totalContra = 0;
  for (const c of contras) totalContra += c.amount;
  console.log('Contra vouchers: ' + contras.length + ', Total: Rs.' + totalContra);

  // Balance entries
  const balances = await b.find({ financialYear: '2024-25' }).toArray();
  console.log('\n=== BALANCE ENTRIES (2024-25) ===');
  let assets = 0, liabNet = 0, income = 0, expenses = 0;
  for (const e of balances) {
    const amt = Math.abs(e.amount || e.closing_balance || 0);
    const cat = (e.category || '').toLowerCase();
    const parent = (e.parentGroup || '').toLowerCase();
    const dr = (e.drCr || e.balance_type || '').toLowerCase();
    
    if (cat === 'asset' || parent.includes('fixed asset') || parent.includes('current asset') || parent.includes('bank') || parent.includes('cash')) {
      assets += amt;
      console.log('  ASSET: ' + e.ledgerName + ' = Rs.' + amt + ' (' + dr + ')');
    } else if (cat === 'liability' || parent.includes('capital') || parent.includes('loan') || parent.includes('creditor') || parent.includes('provision') || parent.includes('reserve')) {
      if (dr.startsWith('d')) liabNet -= amt; else liabNet += amt;
      console.log('  LIAB: ' + e.ledgerName + ' = Rs.' + amt + ' (' + dr + ') → ' + (dr.startsWith('d') ? '-' : '+'));
    } else if (cat === 'income' || cat === 'revenue') {
      income += amt;
      console.log('  INCOME: ' + e.ledgerName + ' = Rs.' + amt);
    } else if (cat === 'expense') {
      expenses += amt;
      console.log('  EXP: ' + e.ledgerName + ' = Rs.' + amt);
    } else {
      console.log('  ???: ' + e.ledgerName + ' | cat=' + cat + ' parent=' + parent + ' amt=Rs.' + amt + ' (' + dr + ')');
    }
  }
  
  console.log('\n=== BS SUMMARY ===');
  console.log('Assets: Rs.' + assets);
  console.log('Liabilities (net): Rs.' + liabNet);
  console.log('Income: Rs.' + income);
  console.log('Expenses: Rs.' + expenses);
  console.log('Net Profit: Rs.' + (income - expenses));
  console.log('A vs L+P: Rs.' + assets + ' vs Rs.' + (liabNet + income - expenses));
  console.log('Gap: Rs.' + (assets - liabNet - income + expenses));

  // Now check: what does P&L API see?
  // P&L aggregates from vouchers: Receipt = income, Payment = expense
  console.log('\n=== P&L FROM VOUCHERS (what API computes) ===');
  console.log('Total Income (all receipts): Rs.' + totalReceipts);
  console.log('Total Expenses (all payments): Rs.' + totalPay);
  console.log('Voucher P&L: Rs.' + (totalReceipts - totalPay));
  console.log('\nIF we exclude investment from income:');
  console.log('True Income: Rs.' + (totalReceipts - investTotal));
  console.log('True P&L: Rs.' + (totalReceipts - investTotal - totalPay));

  await mongoose.disconnect();
}
run();
