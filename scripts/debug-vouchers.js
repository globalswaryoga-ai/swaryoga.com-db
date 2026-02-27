require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  for (const fy of ['2023-24', '2024-25']) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FY ${fy} — VOUCHER ANALYSIS`);
    console.log('='.repeat(60));

    const vouchers = await db.collection('acc_vouchers')
      .find({ financialYear: fy, isReversed: { $ne: true } })
      .sort({ date: 1 })
      .toArray();

    console.log(`Total vouchers: ${vouchers.length}`);

    // Sum entries by ledger name
    const ledgerTotals = {};
    for (const v of vouchers) {
      for (const e of (v.entries || [])) {
        const name = e.ledgerName;
        if (!ledgerTotals[name]) ledgerTotals[name] = { dr: 0, cr: 0, count: 0 };
        ledgerTotals[name].count++;
        const amt = Math.abs(e.amount || 0);
        if (e.type === 'DEBIT') ledgerTotals[name].dr += amt;
        else ledgerTotals[name].cr += amt;
      }
    }

    // Get capital ledger names
    const capitalLedgers = await db.collection('acc_ledgers')
      .find({ financialYear: fy, group: 'CAPITAL' })
      .toArray();
    const capitalNames = new Set(capitalLedgers.map(l => l.name));

    console.log(`\n--- Capital Account ledger voucher entries ---`);
    for (const [name, t] of Object.entries(ledgerTotals)) {
      if (capitalNames.has(name)) {
        console.log(`  ${name}: Dr=${t.dr.toFixed(2)}, Cr=${t.cr.toFixed(2)}, entries=${t.count}`);
      }
    }

    // Show all vouchers hitting Capital Account ledgers
    console.log(`\n--- Individual vouchers hitting Capital Account ledgers ---`);
    for (const v of vouchers) {
      for (const e of (v.entries || [])) {
        if (capitalNames.has(e.ledgerName)) {
          console.log(`  ${v.date} | ${v.type} | ${v.voucherNumber} | ${e.ledgerName} | ${e.type} ${e.amount} | "${v.narration || ''}".substring(0,60)`);
        }
      }
    }

    // Group-wise voucher impact
    console.log(`\n--- Voucher turnover by Group ---`);
    const allLedgers = await db.collection('acc_ledgers')
      .find({ financialYear: fy })
      .toArray();
    const nameToGroup = {};
    for (const l of allLedgers) nameToGroup[l.name] = l.group;

    const groupVoucherTotals = {};
    for (const [name, t] of Object.entries(ledgerTotals)) {
      const g = nameToGroup[name] || 'UNKNOWN';
      if (!groupVoucherTotals[g]) groupVoucherTotals[g] = { dr: 0, cr: 0 };
      groupVoucherTotals[g].dr += t.dr;
      groupVoucherTotals[g].cr += t.cr;
    }
    for (const [g, t] of Object.entries(groupVoucherTotals)) {
      console.log(`  ${g}: Dr=${t.dr.toFixed(2)}, Cr=${t.cr.toFixed(2)}, Net=${(t.dr - t.cr).toFixed(2)}`);
    }

    // Expected Tally Trial Balance
    console.log(`\n--- Expected Tally Trial Balance (OB + Vouchers) ---`);
    const ledgersFull = await db.collection('acc_ledgers')
      .find({ financialYear: fy, isActive: true })
      .toArray();
    
    const groupExpected = {};
    for (const l of ledgersFull) {
      const g = l.group;
      if (!groupExpected[g]) groupExpected[g] = { dr: 0, cr: 0 };
      const ob = l.openingBalance || 0;
      const obType = l.openingBalanceType || 'DEBIT';
      // OB contribution
      if (obType === 'DEBIT') groupExpected[g].dr += ob;
      else groupExpected[g].cr += ob;
    }
    // Add voucher impacts
    for (const [name, t] of Object.entries(ledgerTotals)) {
      const g = nameToGroup[name] || 'UNKNOWN';
      if (!groupExpected[g]) groupExpected[g] = { dr: 0, cr: 0 };
      groupExpected[g].dr += t.dr;
      groupExpected[g].cr += t.cr;
    }
    for (const [g, t] of Object.entries(groupExpected)) {
      console.log(`  ${g}: Dr=${t.dr.toFixed(2)}, Cr=${t.cr.toFixed(2)}`);
    }
  }

  await mongoose.disconnect();
}
check();
