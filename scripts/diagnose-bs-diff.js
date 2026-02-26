// Diagnose BS imbalance of Rs 3,97,719
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25', isActive: true }).toArray();
  console.log('Active ledgers: ' + ledgers.length);

  // Check field names
  console.log('\n=== LEDGER FIELD CHECK ===');
  for (const l of ledgers.slice(0, 5)) {
    console.log(l.name + ' | group:' + l.group + ' | OB:' + l.openingBalance + ' | balanceType:' + l.balanceType + ' | openingBalanceType:' + l.openingBalanceType);
  }

  // The engine reads openingBalanceType but we might have set balanceType
  const mismatched = ledgers.filter(l => l.balanceType && !l.openingBalanceType);
  console.log('\nLedgers with balanceType but no openingBalanceType: ' + mismatched.length);
  if (mismatched.length > 0) {
    mismatched.forEach(l => console.log('  ' + l.name + ' | OB:' + l.openingBalance + ' | balanceType:' + l.balanceType));
  }

  // Check voucher entries with invalid ledgerIds
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  console.log('\nTotal vouchers: ' + vouchers.length);

  const ledgerIds = new Set(ledgers.map(l => l._id.toString()));
  let orphanEntries = 0;
  let orphanTotal = 0;
  for (const v of vouchers) {
    for (const e of v.entries) {
      if (!ledgerIds.has(e.ledgerId?.toString())) {
        orphanEntries++;
        orphanTotal += e.amount;
        if (orphanEntries <= 5) console.log('  ORPHAN: ' + v.voucherNumber + ' | ' + e.ledgerName + ' | ' + e.type + ' | Rs ' + e.amount + ' | ledgerId: ' + e.ledgerId);
      }
    }
  }
  console.log('Orphan entries (no matching ledger): ' + orphanEntries + ' = Rs ' + orphanTotal.toFixed(2));

  // Simulate TB
  const voucherTotals = {};
  for (const v of vouchers) {
    for (const e of v.entries) {
      const lid = e.ledgerId?.toString();
      if (!lid) continue;
      if (!voucherTotals[lid]) voucherTotals[lid] = { debit: 0, credit: 0 };
      if (e.type === 'DEBIT') voucherTotals[lid].debit += e.amount;
      if (e.type === 'CREDIT') voucherTotals[lid].credit += e.amount;
    }
  }

  console.log('\n=== SIMULATED TRIAL BALANCE ===');
  let tbDebit = 0, tbCredit = 0;
  const groups = {};
  for (const l of ledgers) {
    const lid = l._id.toString();
    // Engine uses openingBalanceType
    const obType = l.openingBalanceType || null;
    const ob = l.openingBalance || 0;
    const openDebit = obType === 'DEBIT' ? ob : 0;
    const openCredit = obType === 'CREDIT' ? ob : 0;

    const vt = voucherTotals[lid] || { debit: 0, credit: 0 };
    const totalD = openDebit + vt.debit;
    const totalC = openCredit + vt.credit;
    const net = totalD - totalC;
    const closing = Math.abs(net);
    const type = net >= 0 ? 'Dr' : 'Cr';

    if (closing > 0.01) {
      if (type === 'Dr') tbDebit += closing;
      else tbCredit += closing;

      if (!groups[l.group]) groups[l.group] = { debit: 0, credit: 0, items: [] };
      if (type === 'Dr') groups[l.group].debit += closing;
      else groups[l.group].credit += closing;
      groups[l.group].items.push({ name: l.name, closing, type, group: l.group, subGroup: l.subGroup });
    }
  }

  console.log('TB Debit: Rs ' + tbDebit.toFixed(2));
  console.log('TB Credit: Rs ' + tbCredit.toFixed(2));
  console.log('TB Diff: Rs ' + (tbDebit - tbCredit).toFixed(2));

  for (const [g, data] of Object.entries(groups)) {
    console.log('\n-- ' + g + ': Dr ' + data.debit.toFixed(2) + ' | Cr ' + data.credit.toFixed(2));
    data.items.sort((a, b) => b.closing - a.closing);
    data.items.forEach(i => console.log('    ' + i.type + ' Rs ' + i.closing.toFixed(2) + ' | ' + i.name + ' (' + i.subGroup + ')'));
  }

  // Check if the issue is openingBalanceType missing
  console.log('\n=== OPENING BALANCE CHECK ===');
  const withOB = ledgers.filter(l => (l.openingBalance || 0) > 0);
  console.log('Ledgers with OB > 0: ' + withOB.length);
  withOB.forEach(l => {
    const obPickedUp = l.openingBalanceType ? l.openingBalance : 0;
    console.log('  ' + l.name + ' | OB:' + l.openingBalance + ' | openingBalanceType:' + (l.openingBalanceType || 'MISSING') + ' | Engine reads: Rs ' + obPickedUp);
  });

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
