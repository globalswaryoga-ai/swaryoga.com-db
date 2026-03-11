const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const admin = await db.collection('crm_user_settings').findOne({ userId: 'admincrm' });

  const dbSecret = admin?.qrBridgeSecret;
  const envSecret = process.env.WHATSAPP_BRIDGE_SECRET;
  const bridgeBase = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
  const tenantId = admin?.permanentTenantId;

  console.log('=== Bridge Auth Debug ===');
  console.log('DB secret:', dbSecret);
  console.log('ENV secret:', envSecret);
  console.log('Bridge base:', bridgeBase);
  console.log('Tenant ID:', tenantId);
  console.log('Secrets match:', dbSecret === envSecret);
  console.log('');

  // Test 1: Direct bridge /status (no tenant prefix)
  console.log('--- Test 1: Direct /status (no tenant) ---');
  try {
    const res = await fetch(bridgeBase + '/status', {
      headers: { 'x-bridge-secret': envSecret }
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body.substring(0, 200));
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('');

  // Test 2: Tenant /status with env secret
  console.log('--- Test 2: /tenant/' + tenantId + '/status with ENV secret ---');
  try {
    const res = await fetch(bridgeBase + '/tenant/' + tenantId + '/status', {
      headers: { 'x-bridge-secret': envSecret }
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body.substring(0, 200));
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('');

  // Test 3: Tenant /status with DB secret
  if (dbSecret !== envSecret) {
    console.log('--- Test 3: /tenant/' + tenantId + '/status with DB secret ---');
    try {
      const res = await fetch(bridgeBase + '/tenant/' + tenantId + '/status', {
        headers: { 'x-bridge-secret': dbSecret }
      });
      console.log('Status:', res.status);
      const body = await res.text();
      console.log('Body:', body.substring(0, 200));
    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  await mongoose.disconnect();
}

check();
