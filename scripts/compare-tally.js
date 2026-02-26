const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  // Get all 2023-24 ledgers
  const ledgers = await db.collection('acc_ledgers').find({
    financialYear: '2023-24',
    isActive: { $ne: false }
  }).toArray();

  console.log('=== FY 2023-24 LEDGERS ===');
  let totalDr = 0, totalCr = 0;
  const groups = {};
  ledgers.forEach(l => {
    const ob = l.openingBalance || 0;
    const obt = l.openingBalanceType || l.balanceType || '';
    if (obt === 'Dr') totalDr += ob;
    else totalCr += ob;
    const g = l.group || 'UNKNOWN';
    if (!groups[g]) groups[g] = [];
    groups[g].push({ name: l.name, subGroup: l.subGroup, ob, obt });
    console.log(`  ${l.name} | ${g} | ${l.subGroup} | OB: ${ob} ${obt}`);
  });

  console.log('\nTotal OB Dr:', totalDr, '| Total OB Cr:', totalCr, '| Diff:', totalDr - totalCr);

  // Group totals
  console.log('\n=== GROUP TOTALS ===');
  for (const [g, items] of Object.entries(groups)) {
    const total = items.reduce((s, i) => s + i.ob, 0);
    console.log(`${g}: Rs ${total} (${items.length} ledgers)`);
  }

  // Voucher count
  const vCount = await db.collection('acc_vouchers').countDocuments({ financialYear: '2023-24' });
  console.log('\nVouchers FY 2023-24:', vCount);

  // Compare with Tally Prime
  console.log('\n=== TALLY PRIME (from screenshots) ===');
  console.log('P&L:');
  console.log('  Direct Incomes: 7,03,570');
  console.log('  Indirect Incomes: 50,645');
  console.log('  Indirect Expenses: 8,03,178');
  console.log('  Nett Profit: 48,963');
  console.log('BS:');
  console.log('  Fixed Assets: 7,95,438');
  console.log('  Current Assets: 4,69,096');
  console.log('  Capital Account: 6,13,771');
  console.log('  Current Liabilities: 3,02,007');
  console.log('  Difference in opening balances: 3,48,756');

  // Also check 2024-25 ledgers for comparison
  const l25 = await db.collection('acc_ledgers').find({
    financialYear: '2024-25',
    isActive: { $ne: false }
  }).toArray();
  console.log('\n=== FY 2024-25 LEDGER COUNT:', l25.length, '===');

  await m.disconnect();
})();
