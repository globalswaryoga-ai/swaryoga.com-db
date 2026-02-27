require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  for (const fy of ['2023-24', '2024-25']) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FY ${fy} — LEDGER OPENING BALANCES BY GROUP`);
    console.log('='.repeat(60));

    const ledgers = await db.collection('acc_ledgers')
      .find({ financialYear: fy, isActive: true })
      .sort({ group: 1, subGroup: 1, name: 1 })
      .toArray();

    const groupTotals = {};
    for (const l of ledgers) {
      const g = l.group || 'UNKNOWN';
      if (!groupTotals[g]) groupTotals[g] = { dr: 0, cr: 0, items: [] };
      const ob = l.openingBalance || 0;
      const type = l.openingBalanceType || 'DEBIT';
      if (type === 'DEBIT') groupTotals[g].dr += ob;
      else groupTotals[g].cr += ob;
      if (ob > 0) groupTotals[g].items.push({ name: l.name, subGroup: l.subGroup, ob, type });
    }

    let totalDr = 0, totalCr = 0;
    for (const [g, d] of Object.entries(groupTotals)) {
      console.log(`\n  ${g}: Dr=${d.dr.toFixed(2)}, Cr=${d.cr.toFixed(2)}, Net=${(d.dr - d.cr).toFixed(2)}`);
      totalDr += d.dr;
      totalCr += d.cr;
      for (const i of d.items) {
        console.log(`    ${i.type.padEnd(6)} ${String(i.ob).padStart(12)} -> ${i.name} [${i.subGroup}]`);
      }
    }
    console.log(`\n  TOTAL: Dr=${totalDr.toFixed(2)}, Cr=${totalCr.toFixed(2)}`);

    // What Tally export produces: sign convention
    console.log(`\n  --- Tally XML Sign Convention (what gets exported) ---`);
    let tallyAssets = 0, tallyLiab = 0;
    for (const l of ledgers) {
      const ob = l.openingBalance || 0;
      if (ob === 0) continue;
      const type = l.openingBalanceType || 'DEBIT';
      const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';
      // Mirror export logic: Tally OB = DEBIT->negative, CREDIT->positive; Nominal=0
      const tallyOB = isNominal ? 0 : (type === 'DEBIT' ? -ob : ob);
      if (tallyOB !== 0) {
        const side = tallyOB < 0 ? 'DEBIT(Asset)' : 'CREDIT(Liab)';
        // In Tally: negative OB = debit = asset side, positive OB = credit = liability side
        if (tallyOB < 0) tallyAssets += Math.abs(tallyOB);
        else tallyLiab += tallyOB;
        console.log(`    ${side.padEnd(14)} ${tallyOB.toFixed(2).padStart(14)} -> ${l.name} [${l.group}/${l.subGroup}]`);
      }
    }
    console.log(`\n  Tally BS will show: Assets=${tallyAssets.toFixed(2)}, Liabilities=${tallyLiab.toFixed(2)}`);

    // Check for ledgers with both DEBIT OB but in LIABILITY/CAPITAL group (would show on wrong side)
    console.log(`\n  --- Potential Sign Issues ---`);
    for (const l of ledgers) {
      const ob = l.openingBalance || 0;
      if (ob === 0) continue;
      const type = l.openingBalanceType || 'DEBIT';
      // Liability/Capital with DEBIT OB = shows on Assets side in Tally (wrong!)
      if ((l.group === 'LIABILITY' || l.group === 'CAPITAL') && type === 'DEBIT') {
        console.log(`    WARNING: ${l.name} [${l.group}/${l.subGroup}] has DEBIT OB ${ob} — will show on ASSETS side!`);
      }
      // Asset with CREDIT OB = shows on Liabilities side
      if (l.group === 'ASSET' && type === 'CREDIT') {
        console.log(`    WARNING: ${l.name} [${l.group}/${l.subGroup}] has CREDIT OB ${ob} — will show on LIABILITIES side!`);
      }
    }
  }

  await mongoose.disconnect();
}
check();
