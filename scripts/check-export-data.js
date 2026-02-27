require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;
  
  // Get all groups
  const groups = await db.collection('acc_groups').find({}).sort({ nature: 1, name: 1 }).toArray();
  console.log('=== GROUPS (' + groups.length + ') ===');
  for (const g of groups) {
    console.log(JSON.stringify({ name: g.name, nature: g.nature, report: g.report, financialYear: g.financialYear }));
  }
  
  // Get all ledgers with their groups
  const ledgers = await db.collection('acc_ledgers').find({}).sort({ group: 1, subGroup: 1, name: 1 }).toArray();
  console.log('\n=== LEDGERS (' + ledgers.length + ') ===');
  for (const l of ledgers) {
    console.log(JSON.stringify({
      name: l.name,
      group: l.group,
      subGroup: l.subGroup,
      openingBalance: l.openingBalance,
      openingBalanceType: l.openingBalanceType,
      financialYear: l.financialYear
    }));
  }
  
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
