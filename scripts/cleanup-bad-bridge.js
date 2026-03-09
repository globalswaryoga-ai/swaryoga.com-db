const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');
  const col = crm.collection('crm_user_settings');

  const adminBridgeUrl = 'http://13.62.126.213:3333';

  // Find non-admin users who have the admin's bridge URL
  const badRecords = await col.find({
    userId: { $ne: 'admincrm' },
    qrBridgeUrl: adminBridgeUrl
  }).toArray();

  console.log('Bad records (non-admin users with admin bridge URL):', badRecords.length);
  badRecords.forEach(r => console.log('  -', r.userId, '| url:', r.qrBridgeUrl));

  if (badRecords.length > 0) {
    const result = await col.updateMany(
      { userId: { $ne: 'admincrm' }, qrBridgeUrl: adminBridgeUrl },
      { $unset: { qrBridgeUrl: '' } }
    );
    console.log('Cleaned', result.modifiedCount, 'records');
  }

  // Verify final state
  const all = await col.find({}).toArray();
  console.log('\nFinal state:');
  all.forEach(s => {
    console.log('  ', s.userId, '| url:', s.qrBridgeUrl || '(none)', '| enabled:', s.qrWhatsappEnabled || false);
  });

  await mongoose.disconnect();
}

cleanup().catch(e => { console.error(e); process.exit(1); });
