#!/usr/bin/env node
/**
 * Test engine.ts reports directly for both FYs.
 * Simulates what the API would return.
 */
process.env.NODE_PATH = __dirname + '/../node_modules';
require('module').Module._initPaths();

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// We need to use ts-node or tsx to load TypeScript engine
// Instead, let's manually replicate the engine logic with raw mongoose

const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  for (const fy of ['2023-24', '2024-25']) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  BALANCE SHEET — FY ${fy}`);
    console.log(`${'='.repeat(60)}`);

    const ledgers = await db.collection('acc_ledgers').find({ financialYear: fy, isActive: true }).toArray();
    const vouchers = await db.collection('acc_vouchers').find({ financialYear: fy, isReversed: { $ne: true } }).toArray();

    // Calculate closing balance for each ledger
    const balances = [];
    for (const l of ledgers) {
      let openingDebit = 0, openingCredit = 0;
      if (l.openingBalance > 0) {
        if (l.openingBalanceType === 'DEBIT') openingDebit = l.openingBalance;
        else openingCredit = l.openingBalance;
      }

      // Sum voucher entries for this ledger
      let periodDebit = 0, periodCredit = 0;
      for (const v of vouchers) {
        if (!v.entries) continue;
        for (const e of v.entries) {
          if (String(e.ledgerId) === String(l._id)) {
            if (e.type === 'DEBIT') periodDebit += e.amount;
            else periodCredit += e.amount;
          }
        }
      }

      const totalDebit = openingDebit + periodDebit;
      const totalCredit = openingCredit + periodCredit;
      const net = totalDebit - totalCredit;
      const closingBalance = Math.abs(net);
      const closingBalanceType = net >= 0 ? 'DEBIT' : 'CREDIT';

      balances.push({
        name: l.name,
        group: l.group,
        subGroup: l.subGroup,
        closingBalance,
        closingBalanceType,
        periodDebit,
        periodCredit,
      });
    }

    // Build BS
    const assets = [], liabilities = [], capital = [];
    let totalAssets = 0, totalLiabilities = 0, totalCapital = 0;

    for (const b of balances) {
      if (b.closingBalance < 0.01) continue;

      if (b.group === 'ASSET') {
        const signed = b.closingBalanceType === 'DEBIT' ? b.closingBalance : -b.closingBalance;
        assets.push({ name: b.name, subGroup: b.subGroup, amount: signed });
        totalAssets += signed;
      } else if (b.group === 'LIABILITY') {
        const signed = b.closingBalanceType === 'CREDIT' ? b.closingBalance : -b.closingBalance;
        liabilities.push({ name: b.name, subGroup: b.subGroup, amount: signed });
        totalLiabilities += signed;
      } else if (b.group === 'CAPITAL') {
        const signed = b.closingBalanceType === 'CREDIT' ? b.closingBalance : -b.closingBalance;
        capital.push({ name: b.name, subGroup: b.subGroup, amount: signed });
        totalCapital += signed;
      }
    }

    // Build P&L
    let totalIncome = 0, totalExpense = 0;
    const incomeItems = [], expenseItems = [];
    for (const b of balances) {
      if (b.group === 'INCOME') {
        const amt = b.closingBalanceType === 'CREDIT' ? b.closingBalance : -b.closingBalance;
        incomeItems.push({ name: b.name, amount: Math.abs(amt) });
        totalIncome += Math.abs(amt);
      } else if (b.group === 'EXPENSE') {
        const amt = b.closingBalanceType === 'DEBIT' ? b.closingBalance : -b.closingBalance;
        expenseItems.push({ name: b.name, amount: Math.abs(amt) });
        totalExpense += Math.abs(amt);
      }
    }
    const netProfit = totalIncome - totalExpense;
    const isProfit = netProfit >= 0;

    // Display Assets
    console.log('\n📊 ASSETS:');
    assets.forEach(a => console.log(`  ${a.name} (${a.subGroup}): ₹${a.amount.toLocaleString('en-IN')}`));
    console.log(`  ────────────────────`);
    console.log(`  Total Assets: ₹${totalAssets.toLocaleString('en-IN')}`);

    // Display Capital
    console.log('\n📊 CAPITAL / EQUITY:');
    capital.forEach(c => console.log(`  ${c.name} (${c.subGroup}): ₹${c.amount.toLocaleString('en-IN')}`));
    console.log(`  ${isProfit ? 'Current Year Profit' : 'Current Year Loss'} (Auto from P&L): ₹${Math.abs(netProfit).toLocaleString('en-IN')}`);

    // Display Liabilities
    console.log('\n📊 LIABILITIES:');
    liabilities.forEach(l => console.log(`  ${l.name} (${l.subGroup}): ₹${l.amount.toLocaleString('en-IN')}`));

    const capitalAdjusted = totalCapital + netProfit;
    const liabPlusCapital = totalLiabilities + capitalAdjusted;

    console.log('\n📊 P&L SUMMARY:');
    console.log(`  Total Income: ₹${totalIncome.toLocaleString('en-IN')}`);
    console.log(`  Total Expense: ₹${totalExpense.toLocaleString('en-IN')}`);
    console.log(`  Net ${isProfit ? 'Profit' : 'Loss'}: ₹${Math.abs(netProfit).toLocaleString('en-IN')}`);

    console.log('\n📊 BS EQUATION:');
    console.log(`  Total Assets: ₹${totalAssets.toLocaleString('en-IN')}`);
    console.log(`  Liab + Capital: ₹${liabPlusCapital.toLocaleString('en-IN')}`);
    console.log(`  Difference: ₹${Math.abs(totalAssets - liabPlusCapital).toLocaleString('en-IN')}`);
    console.log(`  Status: ${Math.abs(totalAssets - liabPlusCapital) < 1 ? '✅ BALANCED' : '❌ IMBALANCED'}`);

    // Trial Balance check
    console.log('\n📊 TRIAL BALANCE:');
    let tbDebit = 0, tbCredit = 0;
    for (const b of balances) {
      if (b.closingBalance > 0) {
        if (b.closingBalanceType === 'DEBIT') tbDebit += b.closingBalance;
        else tbCredit += b.closingBalance;
      }
    }
    console.log(`  Total Debit: ₹${tbDebit.toLocaleString('en-IN')}`);
    console.log(`  Total Credit: ₹${tbCredit.toLocaleString('en-IN')}`);
    console.log(`  Difference: ₹${Math.abs(tbDebit - tbCredit).toLocaleString('en-IN')}`);
    console.log(`  Status: ${Math.abs(tbDebit - tbCredit) < 1 ? '✅ BALANCED' : '❌ IMBALANCED'}`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
