require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  const fy = '2024-25';
  const vouchers = await db.collection('acc_vouchers')
    .find({ financialYear: fy, isReversed: { $ne: true } })
    .sort({ date: 1 })
    .toArray();

  const ledgers = await db.collection('acc_ledgers')
    .find({ financialYear: fy, isActive: true })
    .toArray();

  const nameToGroup = {};
  for (const l of ledgers) nameToGroup[l.name] = { group: l.group, subGroup: l.subGroup };

  // Compute closing balance for each ledger: OB + voucher impacts
  const closing = {};
  for (const l of ledgers) {
    const ob = l.openingBalance || 0;
    const obType = l.openingBalanceType || 'DEBIT';
    // Positive = debit net, Negative = credit net
    closing[l.name] = obType === 'DEBIT' ? ob : -ob;
  }

  for (const v of vouchers) {
    for (const e of (v.entries || [])) {
      if (!closing[e.ledgerName]) closing[e.ledgerName] = 0;
      const amt = Math.abs(e.amount || 0);
      if (e.type === 'DEBIT') closing[e.ledgerName] += amt;
      else closing[e.ledgerName] -= amt;
    }
  }

  // Summarize by Tally BS categories
  let totalAssets = 0, totalLiab = 0, totalIncome = 0, totalExpense = 0;
  
  console.log('=== CLOSING BALANCES (OB + VOUCHERS) ===\n');
  
  const groups = ['ASSET', 'CAPITAL', 'LIABILITY', 'INCOME', 'EXPENSE'];
  for (const g of groups) {
    let gDr = 0, gCr = 0;
    const items = [];
    for (const [name, bal] of Object.entries(closing)) {
      const info = nameToGroup[name];
      if (!info || info.group !== g) continue;
      if (Math.abs(bal) < 0.01) continue;
      items.push({ name, subGroup: info.subGroup, bal });
      if (bal > 0) gDr += bal;
      else gCr += Math.abs(bal);
    }
    
    console.log(`${g}: Total Dr=${gDr.toFixed(2)} Cr=${gCr.toFixed(2)} Net=${(gDr - gCr).toFixed(2)}`);
    for (const i of items.sort((a,b) => Math.abs(b.bal) - Math.abs(a.bal))) {
      const side = i.bal > 0 ? 'Dr' : 'Cr';
      console.log(`  ${side} ${Math.abs(i.bal).toFixed(2).padStart(12)} ${i.name} [${i.subGroup}]`);
    }
    console.log('');
  }

  // Verify what Tally XML actually generates
  console.log('=== WHAT TALLY XML PRODUCES ===\n');
  
  // OBs in XML (nominal=0)
  let xmlAssetDr = 0, xmlLiabCr = 0;
  for (const l of ledgers) {
    const ob = l.openingBalance || 0;
    if (ob === 0) continue;
    const obType = l.openingBalanceType || 'DEBIT';
    const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';
    const tallyOB = isNominal ? 0 : (obType === 'DEBIT' ? -ob : ob);
    if (tallyOB < 0) xmlAssetDr += Math.abs(tallyOB);
    else if (tallyOB > 0) xmlLiabCr += tallyOB;
  }
  console.log(`XML Opening Balances: Assets(Dr)=${xmlAssetDr.toFixed(2)}, Liab(Cr)=${xmlLiabCr.toFixed(2)}`);
  
  // Voucher impacts (what Tally computes from imported vouchers)
  let vDr = 0, vCr = 0;
  for (const v of vouchers) {
    for (const e of (v.entries || [])) {
      const amt = Math.abs(e.amount || 0);
      if (e.type === 'DEBIT') vDr += amt;
      else vCr += amt;
    }
  }
  console.log(`Voucher totals: Dr=${vDr.toFixed(2)}, Cr=${vCr.toFixed(2)}, Diff=${(vDr - vCr).toFixed(2)}`);

  // Check for unbalanced vouchers
  console.log('\n=== UNBALANCED VOUCHERS ===');
  let unbalCount = 0;
  for (const v of vouchers) {
    let dr = 0, cr = 0;
    for (const e of (v.entries || [])) {
      const amt = Math.abs(e.amount || 0);
      if (e.type === 'DEBIT') dr += amt;
      else cr += amt;
    }
    if (Math.abs(dr - cr) > 0.01) {
      unbalCount++;
      console.log(`  UNBALANCED: ${v.voucherNumber} ${v.type} ${v.date} Dr=${dr} Cr=${cr} Diff=${(dr-cr).toFixed(2)}`);
      for (const e of v.entries) {
        console.log(`    ${e.type} ${e.amount} ${e.ledgerName}`);
      }
    }
  }
  if (unbalCount === 0) console.log('  All vouchers balanced');

  // CRM BS calculation
  console.log('\n=== CRM BALANCE SHEET (what our app shows) ===');
  let bsAssets = 0, bsLiab = 0, bsCapital = 0, bsIncome = 0, bsExpense = 0;
  for (const [name, bal] of Object.entries(closing)) {
    const info = nameToGroup[name];
    if (!info) continue;
    switch(info.group) {
      case 'ASSET': bsAssets += bal; break;      // Dr positive
      case 'LIABILITY': bsLiab += bal; break;     // Cr negative  
      case 'CAPITAL': bsCapital += bal; break;    // Cr negative
      case 'INCOME': bsIncome += bal; break;      // Cr negative
      case 'EXPENSE': bsExpense += bal; break;    // Dr positive
    }
  }
  const profit = -bsIncome - bsExpense; // income is negative(cr), expense is positive(dr)
  console.log(`  Assets: ${bsAssets.toFixed(2)} (Dr)`);
  console.log(`  Liabilities: ${(-bsLiab).toFixed(2)} (Cr)`);
  console.log(`  Capital: ${(-bsCapital).toFixed(2)} (Cr)`);
  console.log(`  Income: ${(-bsIncome).toFixed(2)} (Cr)`);
  console.log(`  Expense: ${bsExpense.toFixed(2)} (Dr)`);
  console.log(`  Net Profit(Loss): ${profit.toFixed(2)}`);
  console.log(`  BS: Assets ${bsAssets.toFixed(2)} = Capital ${(-bsCapital).toFixed(2)} + Liab ${(-bsLiab).toFixed(2)} + Profit ${profit.toFixed(2)}`);
  console.log(`  Check: ${(-bsCapital - bsLiab + profit).toFixed(2)} should equal ${bsAssets.toFixed(2)}`);

  await mongoose.disconnect();
}
check();
