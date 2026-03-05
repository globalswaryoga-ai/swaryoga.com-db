#!/usr/bin/env node
/**
 * Backfill leads with null/empty funnelStage to 'new_lead'
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  if (!uri) { console.error('MONGODB_URI_MAIN not set'); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const leads = db.collection('leads');

  // Count leads with null/empty funnelStage
  const nullCount = await leads.countDocuments({
    $or: [
      { funnelStage: null },
      { funnelStage: '' },
      { funnelStage: { $exists: false } },
    ],
  });
  console.log(`Found ${nullCount} leads with null/empty funnelStage`);

  if (nullCount > 0) {
    const result = await leads.updateMany(
      {
        $or: [
          { funnelStage: null },
          { funnelStage: '' },
          { funnelStage: { $exists: false } },
        ],
      },
      { $set: { funnelStage: 'new_lead' } }
    );
    console.log(`Updated ${result.modifiedCount} leads to funnelStage='new_lead'`);
  }

  // Verify
  const distribution = await leads.aggregate([
    { $group: { _id: '$funnelStage', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log('\nFunnel Stage Distribution after backfill:');
  distribution.forEach(d => console.log(`  ${d._id || '(null/empty)'}: ${d.count}`));

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
