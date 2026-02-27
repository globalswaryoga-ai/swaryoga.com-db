const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Check ledgers for FY 2023-24 (the one shown in screenshots)
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  
  console.log(`\n=== FY 2023-24 LEDGERS (${ledgers.length} total) ===\n`);
  
  // Group by nature
  const byGroup = {};
  for (const l of ledgers) {
    if (!byGroup[l.group]) byGroup[l.group] = [];
    byGroup[l.group].push(l);
  }
  
  for (const [group, list] of Object.entries(byGroup)) {
    console.log(`\n--- ${group} ---`);
    for (const l of list) {
      const ob = l.openingBalance;
      const obType = l.openingBalanceType || 'N/A';
      const subGroup = l.subGroup || '';
      if (ob !== 0 && ob !== undefined && ob !== null) {
        console.log(`  ${l.name} | OB: ${ob} | Type: ${obType} | subGroup: ${subGroup}`);
      }
    }
  }
  
  // Also check vouchers for 2023-24
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();
  console.log(`\n=== FY 2023-24 VOUCHERS: ${vouchers.length} ===`);
  if (vouchers.length > 0) {
    for (const v of vouchers.slice(0, 5)) {
      console.log(`  ${v.type} ${v.voucherNumber} | ${v.entries?.length} entries`);
      for (const e of v.entries || []) {
        console.log(`    ${e.type} ${e.ledgerName}: ${e.amount}`);
      }
    }
  }
  
  // Show what XML OB would be for each ledger (simulate export logic)
  console.log(`\n=== SIMULATED TALLY OB FOR FY 2023-24 ===`);
  for (const l of ledgers) {
    const ob = Number(l.openingBalance) || 0;
    if (ob === 0) continue;
    const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';
    const tallyOB = isNominal ? 0 : (l.openingBalanceType === 'DEBIT' ? ob : -ob);
    const expectedSide = l.group === 'ASSET' ? 'Debit(+)' : l.group === 'LIABILITY' ? 'Credit(-)' : l.group === 'CAPITAL' ? 'Credit(-)' : l.group;
    console.log(`  ${l.name} | group: ${l.group} | DB OB: ${ob} | DB Type: ${l.openingBalanceType || 'N/A'} | XML OB: ${tallyOB} | Expected: ${expectedSide}`);
  }
  
  // Check FY 2024-25 ledgers with OB
  const ledgers25 = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  console.log(`\n=== FY 2024-25 LEDGERS WITH OB ===`);
  for (const l of ledgers25) {
    const ob = l.openingBalance;
    if (ob !== 0 && ob !== undefined && ob !== null) {
      console.log(`  ${l.name} | OB: ${ob} | Type: ${l.openingBalanceType || 'N/A'} | Group: ${l.group} | subGroup: ${l.subGroup || ''}`);
    }
  }
  
  const vouchers25 = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  console.log(`\n=== FY 2024-25 VOUCHERS: ${vouchers25.length} ===`);
  
  // Check groups
  const groups = await db.collection('acc_groups').find({ financialYear: '2023-24' }).toArray();
  console.log(`\n=== GROUPS FOR 2023-24 (${groups.length}) ===`);
  for (const g of groups) {
    console.log(`  ${g.name} | nature: ${g.nature} | report: ${g.report} | parent: ${g.parent || ''}`);
  }
  
  await client.close();
}
main().catch(console.error);
