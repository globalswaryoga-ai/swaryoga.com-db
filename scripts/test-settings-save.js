const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/');
  await client.connect();
  const db = client.db('swaryoga_admin_crm');

  // Test: manually insert a crm_user_settings document to verify schema works
  const testSettings = {
    userId: 'test-user-check',
    chatFunnels: { '919309986820@s.whatsapp.net': 'lead' },
    chatLabels: { '919309986820@s.whatsapp.net': ['vip', 'follow_up'] },
    labelPresets: [
      { key: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-800' },
    ],
    qrFunnelStages: [
      { key: 'lead', label: 'Lead', color: 'bg-blue-50 text-blue-700 border-blue-300' },
      { key: 'hot', label: 'Hot', color: 'bg-red-50 text-red-700 border-red-300' },
    ],
  };

  // Insert via native MongoDB (bypasses Mongoose schema) to verify collection works
  const result = await db.collection('crm_user_settings').insertOne(testSettings);
  console.log('Inserted test settings:', result.insertedId);

  // Read it back
  const readBack = await db.collection('crm_user_settings').findOne({ userId: 'test-user-check' });
  console.log('\nRead back:');
  console.log('  chatFunnels:', JSON.stringify(readBack.chatFunnels));
  console.log('  chatLabels:', JSON.stringify(readBack.chatLabels));
  console.log('  labelPresets:', readBack.labelPresets?.length);
  console.log('  qrFunnelStages:', readBack.qrFunnelStages?.length);
  console.log('  qrFunnelStages data:', JSON.stringify(readBack.qrFunnelStages));

  // Cleanup
  await db.collection('crm_user_settings').deleteOne({ userId: 'test-user-check' });
  console.log('\nCleaned up test data');

  await client.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
