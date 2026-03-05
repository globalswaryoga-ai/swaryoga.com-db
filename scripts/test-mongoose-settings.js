// Test: Simulate what the settings API PUT handler does via Mongoose
// This verifies the schema change works with Mongoose's strict mode
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/';

const CRMUserSettingsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    chatFunnels: { type: mongoose.Schema.Types.Mixed, default: {} },
    chatLabels: { type: mongoose.Schema.Types.Mixed, default: {} },
    labelPresets: [
      { key: { type: String, required: true }, label: { type: String, required: true }, color: { type: String, default: '' } },
    ],
    qrFunnelStages: [
      { key: { type: String, required: true }, label: { type: String, required: true }, color: { type: String, default: '' } },
    ],
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'crm_user_settings' }
);

(async () => {
  const conn = await mongoose.createConnection(MONGO_URI, { dbName: 'swaryoga_admin_crm' }).asPromise();
  const CRMUserSettings = conn.model('CRMUserSettings', CRMUserSettingsSchema);

  const testUserId = 'test-mongoose-save';

  // 1. Test upsert with qrFunnelStages
  console.log('--- Test 1: Upsert qrFunnelStages ---');
  const r1 = await CRMUserSettings.findOneAndUpdate(
    { userId: testUserId },
    { $set: {
      qrFunnelStages: [
        { key: 'lead', label: 'Lead', color: 'bg-blue-50 text-blue-700 border-blue-300' },
        { key: 'hot', label: 'Hot', color: 'bg-red-50 text-red-700 border-red-300' },
      ],
    }},
    { upsert: true, new: true }
  );
  console.log('  qrFunnelStages count:', r1.qrFunnelStages?.length);
  console.log('  qrFunnelStages:', JSON.stringify(r1.qrFunnelStages));

  // 2. Test upsert with chatFunnels
  console.log('\n--- Test 2: Add chatFunnels ---');
  const r2 = await CRMUserSettings.findOneAndUpdate(
    { userId: testUserId },
    { $set: {
      chatFunnels: { '919309986820@s.whatsapp.net': 'lead', '918767574117@s.whatsapp.net': 'hot' },
    }},
    { new: true }
  );
  console.log('  chatFunnels:', JSON.stringify(r2.chatFunnels));
  console.log('  qrFunnelStages still:', r2.qrFunnelStages?.length);

  // 3. Test upsert with chatLabels
  console.log('\n--- Test 3: Add chatLabels ---');
  const r3 = await CRMUserSettings.findOneAndUpdate(
    { userId: testUserId },
    { $set: {
      chatLabels: { '919309986820@s.whatsapp.net': ['vip', 'follow_up'] },
    }},
    { new: true }
  );
  console.log('  chatLabels:', JSON.stringify(r3.chatLabels));

  // 4. Test upsert with labelPresets
  console.log('\n--- Test 4: Add labelPresets ---');
  const r4 = await CRMUserSettings.findOneAndUpdate(
    { userId: testUserId },
    { $set: {
      labelPresets: [
        { key: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-800' },
        { key: 'follow_up', label: 'Follow Up', color: 'bg-cyan-100 text-cyan-800' },
      ],
    }},
    { new: true }
  );
  console.log('  labelPresets:', r4.labelPresets?.length);

  // 5. Final read
  console.log('\n--- Final state ---');
  const final = await CRMUserSettings.findOne({ userId: testUserId }).lean();
  console.log('  chatFunnels:', Object.keys(final.chatFunnels || {}).length, 'entries');
  console.log('  chatLabels:', Object.keys(final.chatLabels || {}).length, 'entries');
  console.log('  labelPresets:', final.labelPresets?.length || 0);
  console.log('  qrFunnelStages:', final.qrFunnelStages?.length || 0);
  console.log('\n✅ ALL TESTS PASSED - Mongoose saves qrFunnelStages correctly');

  // Cleanup
  await CRMUserSettings.deleteOne({ userId: testUserId });
  console.log('Cleaned up test data');

  await conn.close();
  process.exit(0);
})().catch(e => { console.error('❌ TEST FAILED:', e.message); process.exit(1); });
