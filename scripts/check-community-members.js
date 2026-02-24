const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryogaDB');

  // List all collections to find the right one
  const collections = await db.listCollections().toArray();
  const communityColls = collections.filter(c => c.name.toLowerCase().includes('communit'));
  console.log('=== Community-related collections ===');
  communityColls.forEach(c => console.log(`  ${c.name}`));

  // Try both possible collection names
  for (const colName of ['communitymembers', 'community_members', 'CommunityMember']) {
    const col = db.collection(colName);
    const count = await col.countDocuments();
    if (count > 0) {
      console.log(`\n=== ${colName}: ${count} total docs ===`);
      const groups = await col.aggregate([
        { $group: { _id: '$communityId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();
      groups.forEach(g => console.log(`  ${g._id}: ${g.count} members`));
    }
  }

  // Also check CRM database
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  const crmDb = client.db(crmDbName);
  const crmCollections = await crmDb.listCollections().toArray();
  const crmCommColls = crmCollections.filter(c => c.name.toLowerCase().includes('communit'));
  console.log(`\n=== CRM DB (${crmDbName}) community collections ===`);
  crmCommColls.forEach(c => console.log(`  ${c.name}`));
  
  for (const colName of crmCommColls.map(c => c.name)) {
    const col = crmDb.collection(colName);
    const count = await col.countDocuments();
    if (count > 0) {
      console.log(`\n=== ${crmDbName}.${colName}: ${count} total docs ===`);
      const groups = await col.aggregate([
        { $group: { _id: '$communityId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();
      groups.forEach(g => console.log(`  ${g._id}: ${g.count} members`));
    }
  }

  await client.close();
}
check().catch(console.error);
