const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = c.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Check groups
  const groups = await db.collection('acc_groups').find({ financialYear: '2023-24' }).sort({ nature: 1, name: 1 }).toArray();
  console.log(`=== ACC_GROUPS (FY 2023-24): ${groups.length} ===`);
  for (const g of groups) {
    console.log(`  [${g.nature}] ${g.name} | report: ${g.report} | parentGroupId: ${g.parentGroupId || 'ROOT'} | _id: ${g._id}`);
  }

  // Check ledgers
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24', isActive: true }).sort({ group: 1, subGroup: 1, name: 1 }).toArray();
  console.log(`\n=== ACC_LEDGERS (FY 2023-24): ${ledgers.length} ===`);
  for (const l of ledgers) {
    console.log(`  [${l.group}] ${l.name} | subGroup: ${l.subGroup || 'NONE'} | groupId: ${l.groupId || 'NOT SET'} | OB: ${l.openingBalance} ${l.openingBalanceType}`);
  }

  await c.close();
})();
