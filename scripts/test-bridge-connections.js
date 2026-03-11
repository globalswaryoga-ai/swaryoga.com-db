require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const http = require('http');

async function testBridgeConnection() {
  const uri = process.env.MONGODB_URI_MAIN;
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set');
    process.exit(1);
  }

  try {
    console.log('📡 Testing Bridge Connections\n');

    // Connect to DB
    await mongoose.connect(uri, {
      dbName: crmDbName,
      retryWrites: true,
      w: 'majority',
    });

    const db = mongoose.connection.db;
    const collection = db.collection('crm_user_settings');

    // Get sample users to test
    const testUsers = await collection
      .find()
      .limit(3)
      .toArray();

    console.log(`🧪 Test Bridge URLs for Sample Users:\n`);

    for (const user of testUsers) {
      if (!user.permanentTenantId) continue;

      const bridgeUrl = `http://localhost:3333/tenant/${user.permanentTenantId}`;
      console.log(`👤 USER: ${user.userId}`);
      console.log(`   Tenant ID: ${user.permanentTenantId}`);
      console.log(`   Bridge URL: ${bridgeUrl}`);
      
      // Try to connect to bridge
      await testBridgeUrl(bridgeUrl, user.qrBridgeSecret || 'test-secret');
      console.log();
    }

    console.log('✅ Bridge connection test complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function testBridgeUrl(url, secret) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + '/health',
      method: 'GET',
      timeout: 3000,
      headers: {
        'x-bridge-secret': secret,
      },
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 401) {
        console.log(`   Status: ✅ Bridge responding (HTTP ${res.statusCode})`);
      } else {
        console.log(`   Status: ⚠️  Bridge returned HTTP ${res.statusCode}`);
      }
      resolve();
    });

    req.on('error', (err) => {
      console.log(`   Status: ❌ Cannot reach bridge (${err.message})`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`   Status: ❌ Bridge timeout (check if running)`);
      resolve();
    });

    req.end();
  });
}

testBridgeConnection();
