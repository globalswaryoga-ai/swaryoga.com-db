/**
 * Check bank accounts in FY 2024-25 vouchers
 * Run: node scripts/check-bank-accounts.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  // Get all vouchers for FY 2024-25
  const vouchers = await db.collection('tally_manual_vouchers').find({
    financialYear: '2024-25'
  }).toArray();

  console.log(`Total FY 2024-25 vouchers: ${vouchers.length}\n`);

  // Find unique payment modes / bank references
  const paymentModes = {};
  const ledgerNames = {};
  
  vouchers.forEach(v => {
    const mode = v.paymentMode || 'Unknown';
    if (!paymentModes[mode]) paymentModes[mode] = { count: 0, total: 0, entries: [] };
    paymentModes[mode].count++;
    paymentModes[mode].total += v.amount || 0;
    
    const ledger = v.ledgerName || 'Unknown';
    if (!ledgerNames[ledger]) ledgerNames[ledger] = { count: 0, total: 0 };
    ledgerNames[ledger].count++;
    ledgerNames[ledger].total += v.amount || 0;
  });

  console.log('=== Payment Modes ===');
  Object.entries(paymentModes).sort((a,b) => b[1].total - a[1].total).forEach(([mode, data]) => {
    console.log(`  ${mode.padEnd(30)} Count: ${String(data.count).padStart(4)} | Total: Rs.${data.total.toLocaleString('en-IN')}`);
  });

  console.log('\n=== Ledger Names ===');
  Object.entries(ledgerNames).sort((a,b) => b[1].total - a[1].total).forEach(([name, data]) => {
    console.log(`  ${name.padEnd(40)} Count: ${String(data.count).padStart(4)} | Total: Rs.${data.total.toLocaleString('en-IN')}`);
  });

  // Check receipts (income) with payment modes
  console.log('\n=== Receipt Vouchers by Payment Mode ===');
  const receipts = vouchers.filter(v => v.voucherType === 'Receipt');
  const receiptByMode = {};
  receipts.forEach(v => {
    const mode = v.paymentMode || 'Unknown';
    if (!receiptByMode[mode]) receiptByMode[mode] = { count: 0, total: 0 };
    receiptByMode[mode].count++;
    receiptByMode[mode].total += v.amount || 0;
  });
  Object.entries(receiptByMode).sort((a,b) => b[1].total - a[1].total).forEach(([mode, data]) => {
    console.log(`  ${mode.padEnd(30)} Count: ${String(data.count).padStart(4)} | Total: Rs.${data.total.toLocaleString('en-IN')}`);
  });

  // Check payment vouchers by payment mode
  console.log('\n=== Payment Vouchers by Payment Mode ===');
  const payments = vouchers.filter(v => v.voucherType === 'Payment');
  const paymentByMode = {};
  payments.forEach(v => {
    const mode = v.paymentMode || 'Unknown';
    if (!paymentByMode[mode]) paymentByMode[mode] = { count: 0, total: 0 };
    paymentByMode[mode].count++;
    paymentByMode[mode].total += v.amount || 0;
  });
  Object.entries(paymentByMode).sort((a,b) => b[1].total - a[1].total).forEach(([mode, data]) => {
    console.log(`  ${mode.padEnd(30)} Count: ${String(data.count).padStart(4)} | Total: Rs.${data.total.toLocaleString('en-IN')}`);
  });

  // Contra vouchers (bank transfers)
  console.log('\n=== Contra Vouchers ===');
  const contras = vouchers.filter(v => v.voucherType === 'Contra');
  contras.forEach(v => {
    console.log(`  ${v.date} | ${v.partyName} | ${v.ledgerName || '-'} | ${v.paymentMode || '-'} | Rs.${v.amount} | ${v.narration || ''}`);
  });

  // Journal vouchers
  console.log('\n=== Journal Vouchers ===');
  const journals = vouchers.filter(v => v.voucherType === 'Journal');
  journals.forEach(v => {
    console.log(`  ${v.date} | ${v.partyName} | ${v.ledgerName || '-'} | Rs.${v.amount} | ${v.narration || ''}`);
  });

  // Summary  
  const totalReceipts = receipts.reduce((s, v) => s + (v.amount || 0), 0);
  const totalPayments = payments.reduce((s, v) => s + (v.amount || 0), 0);
  
  console.log('\n=== CASH FLOW SUMMARY ===');
  console.log(`  Total Receipts:  Rs.${totalReceipts.toLocaleString('en-IN')}`);
  console.log(`  Total Payments:  Rs.${totalPayments.toLocaleString('en-IN')}`);
  console.log(`  Net Cash Flow:   Rs.${(totalReceipts - totalPayments).toLocaleString('en-IN')}`);
  
  // FY 2023-24 opening cash
  console.log(`\n  Opening Cash (from FY 2023-24): Rs.3,29,327`);
  console.log(`  + Net Cash Flow:                Rs.${(totalReceipts - totalPayments).toLocaleString('en-IN')}`);
  console.log(`  Expected Closing:               Rs.${(329327 + totalReceipts - totalPayments).toLocaleString('en-IN')}`);
  
  // User provided: Cash 90,000 + bank balances from image
  console.log('\n=== USER PROVIDED BALANCES ===');
  console.log('  Cash:         Rs.90,000');
  console.log('  Bank 1:       Rs.37,440.78 (Cr)');
  console.log('  Bank 2:       Rs.12,85,586.53 (Dr)');
  console.log('  Bank 3:       Rs.12,91,898.72 (Cr)');
  console.log('  Bank 4:       Rs.43,750.97 (Cr)');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
