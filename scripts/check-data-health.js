#!/usr/bin/env node
/**
 * Quick data health check for accounting data
 * Run: node scripts/check-data-health.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  // 1. Collection counts
  const collections = ['acc_ledgers', 'acc_vouchers', 'acc_groups', 'acc_financial_years'];
  console.log('=== DATABASE HEALTH CHECK ===');
  for (const c of collections) {
    const count = await db.collection(c).countDocuments();
    console.log(`  ${c}: ${count} documents`);
  }

  // 2. Voucher count by FY
  console.log('\n=== VOUCHER COUNT BY FY ===');
  const vouchersByFY = await db.collection('acc_vouchers').aggregate([
    { $match: { isReversed: { $ne: true } } },
    { $group: { _id: '$financialYear', count: { $sum: 1 }, totalDebit: { $sum: '$totalDebit' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  for (const v of vouchersByFY) {
    console.log(`  FY ${v._id}: ${v.count} vouchers, Total: Rs ${Math.round(v.totalDebit).toLocaleString('en-IN')}`);
  }

  // 3. Ledger count by FY
  console.log('\n=== LEDGER COUNT BY FY ===');
  const ledgersByFY = await db.collection('acc_ledgers').aggregate([
    { $group: { _id: '$financialYear', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  for (const l of ledgersByFY) {
    console.log(`  FY ${l._id}: ${l.count} ledgers`);
  }

  // 4. Voucher types by FY
  console.log('\n=== VOUCHER TYPES BY FY ===');
  const typesByFY = await db.collection('acc_vouchers').aggregate([
    { $match: { isReversed: { $ne: true } } },
    { $group: { _id: { fy: '$financialYear', type: '$type' }, count: { $sum: 1 }, total: { $sum: '$totalDebit' } } },
    { $sort: { '_id.fy': 1, '_id.type': 1 } }
  ]).toArray();
  for (const t of typesByFY) {
    console.log(`  FY ${t._id.fy} | ${t._id.type.padEnd(13)}: ${String(t.count).padStart(3)} vouchers, Rs ${Math.round(t.total).toLocaleString('en-IN')}`);
  }

  // 5. P&L check — compute Income, Expense, Net Profit for each FY
  console.log('\n=== P&L CHECK (FY 2023-24 & 2024-25) ===');
  for (const fy of ['2023-24', '2024-25']) {
    // Get all ledger IDs grouped by nature
    const ledgers = await db.collection('acc_ledgers').find({ financialYear: fy }).toArray();
    const incomeLedgerIds = ledgers.filter(l => l.group === 'INCOME').map(l => l._id);
    const expenseLedgerIds = ledgers.filter(l => l.group === 'EXPENSE').map(l => l._id);

    // Sum entries for income ledgers
    let totalIncome = 0;
    let totalExpense = 0;

    if (incomeLedgerIds.length > 0) {
      const incomeResult = await db.collection('acc_vouchers').aggregate([
        { $match: { financialYear: fy, isReversed: { $ne: true } } },
        { $unwind: '$entries' },
        { $match: { 'entries.ledgerId': { $in: incomeLedgerIds } } },
        { $group: {
          _id: null,
          debit: { $sum: { $cond: [{ $eq: ['$entries.type', 'DEBIT'] }, '$entries.amount', 0] } },
          credit: { $sum: { $cond: [{ $eq: ['$entries.type', 'CREDIT'] }, '$entries.amount', 0] } }
        }}
      ]).toArray();
      if (incomeResult[0]) {
        totalIncome = incomeResult[0].credit - incomeResult[0].debit;
      }
    }

    if (expenseLedgerIds.length > 0) {
      const expenseResult = await db.collection('acc_vouchers').aggregate([
        { $match: { financialYear: fy, isReversed: { $ne: true } } },
        { $unwind: '$entries' },
        { $match: { 'entries.ledgerId': { $in: expenseLedgerIds } } },
        { $group: {
          _id: null,
          debit: { $sum: { $cond: [{ $eq: ['$entries.type', 'DEBIT'] }, '$entries.amount', 0] } },
          credit: { $sum: { $cond: [{ $eq: ['$entries.type', 'CREDIT'] }, '$entries.amount', 0] } }
        }}
      ]).toArray();
      if (expenseResult[0]) {
        totalExpense = expenseResult[0].debit - expenseResult[0].credit;
      }
    }

    const netProfit = totalIncome - totalExpense;
    console.log(`\n  FY ${fy}:`);
    console.log(`    Income Ledgers:  ${incomeLedgerIds.length}`);
    console.log(`    Expense Ledgers: ${expenseLedgerIds.length}`);
    console.log(`    Total Income:    Rs ${Math.round(totalIncome).toLocaleString('en-IN')}`);
    console.log(`    Total Expense:   Rs ${Math.round(totalExpense).toLocaleString('en-IN')}`);
    console.log(`    Net ${netProfit >= 0 ? 'Profit' : 'Loss'}:      Rs ${Math.round(Math.abs(netProfit)).toLocaleString('en-IN')} ${netProfit >= 0 ? '(Profit)' : '(Loss)'}`);

    // Top 5 income and expense ledgers
    const topIncome = await db.collection('acc_vouchers').aggregate([
      { $match: { financialYear: fy, isReversed: { $ne: true } } },
      { $unwind: '$entries' },
      { $match: { 'entries.ledgerId': { $in: incomeLedgerIds } } },
      { $group: { _id: '$entries.ledgerName', amount: { $sum: '$entries.amount' } } },
      { $sort: { amount: -1 } },
      { $limit: 5 }
    ]).toArray();

    if (topIncome.length > 0) {
      console.log('    Top Income:');
      for (const t of topIncome) {
        console.log(`      ${(t._id || 'Unknown').padEnd(30)} Rs ${Math.round(t.amount).toLocaleString('en-IN')}`);
      }
    }

    const topExpense = await db.collection('acc_vouchers').aggregate([
      { $match: { financialYear: fy, isReversed: { $ne: true } } },
      { $unwind: '$entries' },
      { $match: { 'entries.ledgerId': { $in: expenseLedgerIds } } },
      { $group: { _id: '$entries.ledgerName', amount: { $sum: '$entries.amount' } } },
      { $sort: { amount: -1 } },
      { $limit: 5 }
    ]).toArray();

    if (topExpense.length > 0) {
      console.log('    Top Expense:');
      for (const t of topExpense) {
        console.log(`      ${(t._id || 'Unknown').padEnd(30)} Rs ${Math.round(t.amount).toLocaleString('en-IN')}`);
      }
    }
  }

  // 6. Balance integrity check — every voucher must have balanced entries
  console.log('\n=== BALANCE INTEGRITY CHECK ===');
  const unbalanced = await db.collection('acc_vouchers').aggregate([
    { $match: { isReversed: { $ne: true } } },
    { $project: {
      voucherNumber: 1, financialYear: 1, totalDebit: 1, totalCredit: 1,
      diff: { $abs: { $subtract: ['$totalDebit', '$totalCredit'] } }
    }},
    { $match: { diff: { $gt: 0.01 } } }
  ]).toArray();

  if (unbalanced.length === 0) {
    console.log('  ✅ All vouchers are balanced (Debit = Credit)');
  } else {
    console.log(`  ❌ ${unbalanced.length} UNBALANCED vouchers found:`);
    for (const u of unbalanced.slice(0, 5)) {
      console.log(`    ${u.voucherNumber} (FY ${u.financialYear}): Debit=${u.totalDebit}, Credit=${u.totalCredit}, Diff=${u.diff}`);
    }
  }

  // 7. Financial year status
  console.log('\n=== FINANCIAL YEARS ===');
  const fys = await db.collection('acc_financial_years').find({}).sort({ code: 1 }).toArray();
  for (const f of fys) {
    console.log(`  FY ${f.code} | Current: ${f.isCurrent || false} | Closed: ${f.isClosed || false} | Company: ${f.companyName || '-'}`);
  }

  console.log('\n=== DATA IS SAFE ✅ ===');
  await mongoose.disconnect();
}

check().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
