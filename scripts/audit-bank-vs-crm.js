#!/usr/bin/env node
/**
 * Comprehensive audit: Compare CRM DB data vs Bank Statement
 * 
 * Bank Statement (FY 2024-25):
 *   Opening Balance:     37,440.78 (Cr)
 *   Total Withdrawal:  12,85,586.53 (Dr)  — 415 entries
 *   Total Deposit:     12,91,896.72 (Cr)  — 165 entries
 *   Closing Balance:      43,750.97 (Cr)
 *   Total Entries:       580
 */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri;
for (const line of env.split('\n')) {
  if (line.startsWith('MONGODB_URI_MAIN=')) {
    uri = line.split('=').slice(1).join('=').trim().replace(/["']/g, '');
  }
}

// Bank statement figures
const BANK = {
  openingBalance: 37440.78,
  totalWithdrawal: 1285586.53,
  totalDeposit: 1291896.72,
  closingBalance: 43750.97,
  withdrawalCount: 415,
  depositCount: 165,
  totalEntries: 580,
};

const fmt = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const crmDb = client.db('swaryoga_admin_crm');

  // Check the correct collection (tally_manual_vouchers - what the schema uses)
  const col = crmDb.collection('tally_manual_vouchers');

  console.log('═══════════════════════════════════════════════════════');
  console.log('   FY 2024-25 DATA AUDIT — Bank Statement vs CRM DB');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Count by type
  const byType = await col.aggregate([
    { $match: { financialYear: '2024-25' } },
    { $group: { _id: '$voucherType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]).toArray();

  const typeMap = {};
  for (const t of byType) {
    typeMap[t._id] = { count: t.count, total: t.total };
  }

  const receipts = typeMap['Receipt'] || { count: 0, total: 0 };
  const payments = typeMap['Payment'] || { count: 0, total: 0 };
  const contra = typeMap['Contra'] || { count: 0, total: 0 };
  const totalDocs = byType.reduce((s, t) => s + t.count, 0);

  console.log('── CRM Database (tally_manual_vouchers, FY 2024-25) ──');
  console.log(`  Receipt:  ${receipts.count} entries,  ${fmt(receipts.total)}`);
  console.log(`  Payment:  ${payments.count} entries,  ${fmt(payments.total)}`);
  console.log(`  Contra:   ${contra.count} entries,  ${fmt(contra.total)}`);
  console.log(`  Total:    ${totalDocs} entries`);

  console.log('\n── Bank Statement ──');
  console.log(`  Deposits:     ${BANK.depositCount} entries,  ${fmt(BANK.totalDeposit)}`);
  console.log(`  Withdrawals:  ${BANK.withdrawalCount} entries, ${fmt(BANK.totalWithdrawal)}`);
  console.log(`  Total:        ${BANK.totalEntries} entries`);
  console.log(`  Opening Bal:  ${fmt(BANK.openingBalance)}`);
  console.log(`  Closing Bal:  ${fmt(BANK.closingBalance)}`);
  console.log(`  Check: ${fmt(BANK.openingBalance)} + ${fmt(BANK.totalDeposit)} - ${fmt(BANK.totalWithdrawal)} = ${fmt(BANK.openingBalance + BANK.totalDeposit - BANK.totalWithdrawal)}`);

  // Contra entries appear as BOTH deposit and withdrawal in bank statement
  // So bank deposits = Receipts + Contra, bank withdrawals = Payments + Contra
  const dbDeposits = receipts.total + contra.total;
  const dbWithdrawals = payments.total + contra.total;
  const dbEntryCount = receipts.count + payments.count + (contra.count * 2); // contra counted twice in bank

  console.log('\n── Reconciliation ──');
  console.log(`  DB Deposits (Receipts + Contra):     ${fmt(dbDeposits)}`);
  console.log(`  Bank Deposits:                       ${fmt(BANK.totalDeposit)}`);
  console.log(`  Difference:                          ${fmt(BANK.totalDeposit - dbDeposits)}`);
  console.log();
  console.log(`  DB Withdrawals (Payments + Contra):  ${fmt(dbWithdrawals)}`);
  console.log(`  Bank Withdrawals:                    ${fmt(BANK.totalWithdrawal)}`);
  console.log(`  Difference:                          ${fmt(BANK.totalWithdrawal - dbWithdrawals)}`);
  console.log();
  console.log(`  DB Entry Count (contra x2):          ${dbEntryCount}`);
  console.log(`  Bank Entry Count:                    ${BANK.totalEntries}`);
  console.log(`  Missing entries:                     ${BANK.totalEntries - dbEntryCount}`);

  // Calculate closing balance from DB
  const dbClosing = BANK.openingBalance + receipts.total - payments.total;
  console.log('\n── P&L from DB ──');
  console.log(`  Total Receipts (Income):   ${fmt(receipts.total)}`);
  console.log(`  Total Payments (Expenses): ${fmt(payments.total)}`);
  console.log(`  Net (Receipts - Payments): ${fmt(receipts.total - payments.total)}`);
  console.log(`  Closing Balance calc:      ${fmt(BANK.openingBalance)} + ${fmt(receipts.total)} - ${fmt(payments.total)} = ${fmt(dbClosing)}`);
  console.log(`  Bank Closing Balance:      ${fmt(BANK.closingBalance)}`);
  console.log(`  Difference:                ${fmt(BANK.closingBalance - dbClosing)}`);

  // Check both FYs
  console.log('\n── All FYs in tally_manual_vouchers ──');
  const allFY = await col.aggregate([
    { $group: { _id: '$financialYear', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  for (const fy of allFY) {
    console.log(`  FY ${fy._id}: ${fy.count} docs, ${fmt(fy.total)}`);
  }

  // Sample receipts (they were consolidated monthly)
  console.log('\n── FY 2024-25 Receipts (monthly) ──');
  const recDocs = await col.find({ financialYear: '2024-25', voucherType: 'Receipt' }).sort({ date: 1 }).toArray();
  for (const r of recDocs) {
    console.log(`  ${r.date}  ${r.partyName?.padEnd(15)}  ${fmt(r.amount).padStart(12)}  ${r.narration?.substring(0, 60) || ''}`);
  }

  // Top 10 payments  
  console.log('\n── Top 10 Payments ──');
  const topPay = await col.find({ financialYear: '2024-25', voucherType: 'Payment' }).sort({ amount: -1 }).limit(10).toArray();
  for (const p of topPay) {
    console.log(`  ${p.date}  ${(p.partyName || '').padEnd(25)}  ${fmt(p.amount).padStart(12)}`);
  }

  await client.close();
  console.log('\n═══════════════════════════════════════════════════════');
}

run().catch(e => { console.error(e); process.exit(1); });
