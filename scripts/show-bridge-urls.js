const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const users = await db.collection('crm_user_settings').find(
    {},
    { projection: { userId: 1, permanentTenantId: 1, qrBridgeSecret: 1, qrBridgeUrl: 1 } }
  ).sort({ permanentTenantId: 1 }).toArray();

  const bridgeBase = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
  console.log('Bridge Base URL:', bridgeBase);
  console.log('');
  console.log('User'.padEnd(35) + 'TenantID'.padEnd(12) + 'Bridge URL');
  console.log('-'.repeat(95));
  users.forEach(u => {
    const url = u.permanentTenantId
      ? bridgeBase + '/tenant/' + u.permanentTenantId
      : (u.qrBridgeUrl || '(none)');
    console.log(
      u.userId.padEnd(35) +
      (u.permanentTenantId || '(none)').padEnd(12) +
      url
    );
  });
  console.log('');
  console.log('Total:', users.length, 'users');
  await mongoose.disconnect();
}

check();
