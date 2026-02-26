const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  
  // Check swaryogaDB
  console.log('=== DATABASE: swaryogaDB ===');
  const db1 = c.db('swaryogaDB');
  const cols1 = await db1.listCollections().toArray();
  for (const col of cols1.filter(c => c.name.includes('acc_') || c.name.includes('tally'))) {
    const count = await db1.collection(col.name).countDocuments({});
    const fy2324 = await db1.collection(col.name).countDocuments({ financialYear: '2023-24' });
    console.log(`  ${col.name}: total=${count}, fy2324=${fy2324}`);
  }
  
  // Check swaryoga_admin_crm
  console.log('\n=== DATABASE: swaryoga_admin_crm ===');
  const db2 = c.db('swaryoga_admin_crm');
  const cols2 = await db2.listCollections().toArray();
  for (const col of cols2.filter(c => c.name.includes('acc_') || c.name.includes('tally'))) {
    const count = await db2.collection(col.name).countDocuments({});
    const fy2324 = await db2.collection(col.name).countDocuments({ financialYear: '2023-24' });
    console.log(`  ${col.name}: total=${count}, fy2324=${fy2324}`);
  }
  
  // Check acc_ledgers names in CRM db for 2023-24
  const crmLedgers = await db2.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  if (crmLedgers.length > 0) {
    console.log('\n=== CRM acc_ledgers names (2023-24) ===');
    for (const l of crmLedgers) {
      console.log(`  [${l.group}] ${l.name} | OB: ${l.openingBalance} ${l.openingBalanceType}`);
    }
  }
  
  await c.close();
})();
