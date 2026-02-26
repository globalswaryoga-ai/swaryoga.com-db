// Deep investigation of BS difference for FY 2024-25
const { MongoClient,ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryogaDB');

  console.log('=============================================');
  console.log('  FY 2024-25 ENTERPRISE DATA INVESTIGATION');
  console.log('=============================================');

  // Enterprise FY 2024-25
  const ledgers2425 = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  const vouchers2425 = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  
  console.log('\nEnterprise Ledgers (2024-25):', ledgers2425.length);
  console.log('Enterprise Vouchers (2024-25):', vouchers2425.length);

  if (ledgers2425.length > 0) {
    console.log('\n── Enterprise FY 2024-25 Ledgers ──');
    const byGroup = {};
    ledgers2425.forEach(l => {
      if (!byGroup[l.group]) byGroup[l.group] = [];
      byGroup[l.group].push(l);
    });
    let totalDr = 0, totalCr = 0;
    for (const [group, items] of Object.entries(byGroup)) {
      let groupDr = 0, groupCr = 0;
      console.log(`\n  ${group}:`);
      items.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
        const ob = l.openingBalance || 0;
        const type = l.openingBalanceType || 'DEBIT';
        if (type === 'DEBIT') { totalDr += ob; groupDr += ob; }
        else { totalCr += ob; groupCr += ob; }
        console.log(`    ${l.name.padEnd(40)} ${ob.toFixed(2).padStart(12)} ${type}`);
      });
      console.log(`    ${'SUBTOTAL'.padEnd(40)} Dr: ${groupDr.toFixed(2)} Cr: ${groupCr.toFixed(2)}`);
    }
    console.log(`\n  Total Dr: ${totalDr.toFixed(2)} | Total Cr: ${totalCr.toFixed(2)} | Diff: ${(totalDr - totalCr).toFixed(2)}`);
  }

  // OLD MANUAL DATA for comparison
  console.log('\n\n=============================================');
  console.log('  OLD MANUAL DATA (tally_manual_balances)');
  console.log('=============================================');

  const manual2324 = await db.collection('tally_manual_balances').find({ financialYear: '2023-24' }).toArray();
  const manual2425 = await db.collection('tally_manual_balances').find({ financialYear: '2024-25' }).toArray();
  const manualVouchers2425 = await db.collection('tally_manual_vouchers').find({ financialYear: '2024-25' }).toArray();

  console.log('\nManual 2023-24 balances:', manual2324.length);
  console.log('Manual 2024-25 balances:', manual2425.length);
  console.log('Manual 2024-25 vouchers:', manualVouchers2425.length);

  if (manual2425.length > 0) {
    console.log('\n── Manual FY 2024-25 Balances ──');
    const byGroup = {};
    manual2425.forEach(l => {
      if (!byGroup[l.group]) byGroup[l.group] = [];
      byGroup[l.group].push(l);
    });
    let totalDr = 0, totalCr = 0;
    for (const [group, items] of Object.entries(byGroup)) {
      let groupDr = 0, groupCr = 0;
      console.log(`\n  ${group} (${items.length}):`);
      items.sort((a,b) => a.name.localeCompare(b.name)).forEach(l => {
        const ob = l.openingBalance || 0;
        const type = l.openingBalanceType || 'DEBIT';
        const cb = l.closingBalance || 0;
        const cbt = l.closingBalanceType || '';
        if (type === 'DEBIT') { totalDr += ob; groupDr += ob; }
        else { totalCr += ob; groupCr += ob; }
        console.log(`    ${l.name.padEnd(40)} OB: ${ob.toFixed(2).padStart(12)} ${type.padEnd(6)} | CB: ${cb.toFixed(2).padStart(12)} ${cbt}`);
      });
      console.log(`    ${'SUBTOTAL'.padEnd(40)} Dr: ${groupDr.toFixed(2)} Cr: ${groupCr.toFixed(2)}`);
    }
    console.log(`\n  Total Dr: ${totalDr.toFixed(2)} | Total Cr: ${totalCr.toFixed(2)} | Diff: ${(totalDr - totalCr).toFixed(2)}`);
  }

  // Screenshot data check - try to match the numbers
  console.log('\n\n=============================================');
  console.log('  SCREENSHOT NUMBERS MATCH');  
  console.log('=============================================');
  console.log('Screenshot BS: Assets=1,51,276.58  L+C=2,32,557.18  Diff=81,280.60');
  console.log('Screenshot PL: Income=3,45,840.80  Expense=3,77,670.47  Loss=31,829.67');

  // Check if old API routes still exist
  console.log('\n\nChecking which API the deployed code uses...');

  await client.close();
})();
