const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/.env.local' });

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  console.log('=== LEDGERS (' + ledgers.length + ') ===');
  for (const l of ledgers.sort((a,b) => (a.group||'').localeCompare(b.group||''))) {
    console.log('  [' + l.group + '/' + (l.subGroup||'-') + '] ' + l.name + ' | OB: ' + (l.openingBalance || 0));
  }

  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();
  console.log('\n=== VOUCHERS (' + vouchers.length + ') ===');
  const byType = {};
  for (const v of vouchers) {
    byType[v.voucherType] = (byType[v.voucherType] || 0) + 1;
  }
  for (const t of Object.keys(byType).sort()) console.log('  ' + t + ': ' + byType[t]);

  console.log('\n=== COMBINED BALANCES (OB + Vouchers) ===');
  const balances = {};
  for (const v of vouchers) {
    for (const e of (v.entries || [])) {
      const key = e.ledger;
      if (!balances[key]) balances[key] = { dr: 0, cr: 0 };
      if (e.type === 'debit') balances[key].dr += e.amount;
      else balances[key].cr += e.amount;
    }
  }
  const combined = {};
  for (const l of ledgers) {
    const ob = l.openingBalance || 0;
    const vb = balances[l.name] || { dr: 0, cr: 0 };
    const netVoucher = vb.dr - vb.cr;
    combined[l.name] = { group: l.group, subGroup: l.subGroup, ob, dr: vb.dr, cr: vb.cr, netVoucher, closing: ob + netVoucher };
  }
  for (const name of Object.keys(balances)) {
    if (!combined[name]) {
      const b = balances[name];
      combined[name] = { group: '??MISSING??', subGroup: '', ob: 0, dr: b.dr, cr: b.cr, netVoucher: b.dr - b.cr, closing: b.dr - b.cr };
    }
  }
  const sortedCombined = Object.entries(combined).sort((a,b) => a[0].localeCompare(b[0]));
  for (const [name, b] of sortedCombined) {
    console.log('  ' + name.padEnd(45) + ' [' + (b.group||'').padEnd(20) + '] OB:' + b.ob.toFixed(2).padStart(12) + ' Dr:' + b.dr.toFixed(2).padStart(12) + ' Cr:' + b.cr.toFixed(2).padStart(12) + ' CB:' + b.closing.toFixed(2).padStart(12));
  }

  const groups = await db.collection('acc_groups').find({ financialYear: '2023-24' }).toArray();
  console.log('\n=== GROUPS (' + groups.length + ') ===');
  for (const g of groups.sort((a,b) => a.name.localeCompare(b.name))) console.log('  ' + g.name + ' [' + g.nature + ']');

  const fys = await db.collection('acc_financial_years').find().toArray();
  console.log('\n=== FINANCIAL YEARS ===');
  for (const f of fys) console.log('  ' + f.code + ' | Closed: ' + f.isClosed);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
