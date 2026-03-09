/**
 * Clean QR WhatsApp Data — Reset for Privacy
 * 
 * 1. Delete stale crm_user_settings for non-admin users (they'll get fresh records on next login)
 * 2. Keep admincrm's settings intact (bridge URL, funnels, labels)
 * 3. Verify whatsapp_messages are all tagged with admincrm
 * 4. Verify baileys_auth_state is all admincrm-prefixed
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function clean() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');

  console.log('=== CLEANING QR WHATSAPP DATA ===\n');

  // 1. Delete stale non-admin user settings
  const stale = await crm.collection('crm_user_settings').find({
    userId: { $ne: 'admincrm' }
  }).toArray();
  console.log('Stale user settings to delete:', stale.length);
  stale.forEach(s => console.log('  -', s.userId));

  if (stale.length > 0) {
    const result = await crm.collection('crm_user_settings').deleteMany({
      userId: { $ne: 'admincrm' }
    });
    console.log('Deleted', result.deletedCount, 'stale settings records');
  }

  // 2. Verify admincrm settings are intact
  const admin = await crm.collection('crm_user_settings').findOne({ userId: 'admincrm' });
  console.log('\nAdmin settings preserved:');
  console.log('  qrBridgeUrl:', admin.qrBridgeUrl);
  console.log('  chatFunnels:', Object.keys(admin.chatFunnels || {}).length, 'entries');
  console.log('  qrFunnelStages:', (admin.qrFunnelStages || []).length, 'stages');

  // 3. Verify messages are all tagged
  const untagged = await crm.collection('whatsapp_messages').countDocuments({
    bridgeUserId: { $exists: false }
  });
  console.log('\nUntagged messages:', untagged, untagged === 0 ? '(CLEAN)' : '(NEEDS FIX)');

  // 4. Verify auth state
  const authCount = await crm.collection('baileys_auth_state').countDocuments();
  const adminAuth = await crm.collection('baileys_auth_state').countDocuments({
    key: { $regex: /^admincrm:/ }
  });
  console.log('Auth state:', authCount, 'total,', adminAuth, 'admincrm');

  // Final state
  console.log('\n=== FINAL STATE ===');
  const remaining = await crm.collection('crm_user_settings').find({}).toArray();
  console.log('crm_user_settings:', remaining.length, 'records');
  remaining.forEach(s => console.log('  ', s.userId, '| bridge:', s.qrBridgeUrl || '(none)'));

  console.log('\nDONE. Non-admin users will get fresh settings on next login.');
  await mongoose.disconnect();
}

clean().catch(e => { console.error(e); process.exit(1); });
