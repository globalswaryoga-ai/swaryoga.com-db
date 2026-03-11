require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

async function testSettingsEndpoint() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set');
    process.exit(1);
  }

  try {
    // Create a test JWT for admincrm
    const jwtSecret = process.env.JWT_SECRET || 'swar-secret-key-2024';
    const testToken = jwt.sign(
      { userId: 'admincrm', email: 'admin@swaryoga.com', isAdmin: true },
      jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('🧪 Testing Settings Endpoint Direct\n');
    console.log(`Token: ${testToken.substring(0, 20)}...\n`);

    // Call the settings endpoint
    const baseUrl = 'http://localhost:3000'; // Running locally
    const response = await fetch(`${baseUrl}/api/admin/crm/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    const text = await response.text();
    console.log('Response Body:');
    console.log(text);

    if (response.ok) {
      const json = JSON.parse(text);
      console.log('\n✅ Response parsed successfully');
      console.log(`  qrBridgeUrl: ${json.qrBridgeUrl ? '✅' : '❌'}`);
      console.log(`  qrBridgeSecret: ${json.qrBridgeSecret ? '✅' : '❌'}`);
      console.log(`  permanentTenantId: ${json.permanentTenantId ? '✅' : '❌'}`);
    } else {
      console.log('\n❌ Response is not OK');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSettingsEndpoint();
