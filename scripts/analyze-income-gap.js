const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');
  
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();

  // Vouchers by type
  const byType = {};
  vouchers.forEach(v => {
    byType[v.type] = byType[v.type] || { count: 0, total: 0 };
    byType[v.type].count++;
    byType[v.type].total += v.totalDebit || 0;
  });
  console.log('=== Vouchers by Type ===');
  Object.entries(byType).forEach(([t, d]) => console.log(`  ${t}: ${d.count} vouchers, Rs ${d.total.toFixed(2)}`));

  // Check each group's credits
  const groups = ['INCOME', 'CAPITAL', 'EXPENSE', 'ASSET', 'LIABILITY'];
  for (const grp of groups) {
    const grpLedgers = ledgers.filter(l => l.group === grp);
    let grpCr = 0, grpDr = 0;
    for (const gl of grpLedgers) {
      let cr = 0, dr = 0;
      for (const v of vouchers) {
        for (const e of v.entries) {
          if (e.ledgerId && e.ledgerId.toString() === gl._id.toString()) {
            if (e.type === 'CREDIT') cr += e.amount || 0;
            if (e.type === 'DEBIT') dr += e.amount || 0;
          }
        }
      }
      if (cr > 0 || dr > 0) {
        console.log(`  ${grp} | ${gl.name} | Dr: ${dr.toFixed(2)} | Cr: ${cr.toFixed(2)}`);
      }
      grpCr += cr;
      grpDr += dr;
    }
    console.log(`  --- ${grp} TOTAL: Dr=${grpDr.toFixed(2)}, Cr=${grpCr.toFixed(2)}`);
  }

  // Total receipts (all CREDIT entries on non-income, non-expense ledgers = source of funds)
  let totalReceipts = 0;
  for (const v of vouchers) {
    if (v.type === 'Receipt' || v.type === 'Contra') {
      totalReceipts += v.totalDebit || 0;
    }
  }
  console.log('\n=== Receipt + Contra total:', totalReceipts.toFixed(2));
  console.log('User expected total income:', 1291896.72);
  console.log('Current P&L Income (INCOME group):', 361889);
  console.log('Difference:', (1291896.72 - 361889).toFixed(2));

  await m.disconnect();
})();
